import { useState, useCallback, useRef, useEffect } from 'react';
import { getUploadSas, registerPhoto } from '../services/api';
import { uploadToBlob } from '../services/blobUpload';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UseMediaUploadReturn extends UploadState {
  upload: (file: File) => Promise<string | null>;
  reset: () => void;
}

/**
 * Hook for uploading media (photo/video/audio) directly to Azure Blob Storage
 * Extended from usePhotoUpload to accept video and audio files
 */
export function useMediaUpload(): UseMediaUploadReturn {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const mountedRef = useRef(true);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Track mount state — must set true in effect body for React strict mode,
  // which runs cleanup between the double-mount cycle in development.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
    };
  }, []);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    // Validate file type
    const isValidType =
      file.type.startsWith('image/') ||
      file.type.startsWith('video/') ||
      file.type.startsWith('audio/');

    if (!isValidType) {
      setState({
        isUploading: false,
        progress: 0,
        error: 'Only image, video, and audio files are allowed',
      });
      return null;
    }

    setState({ isUploading: true, progress: 0, error: null });

    // Abort any in-progress upload
    if (xhrRef.current) {
      xhrRef.current.abort();
    }

    try {
      const sasResponse = await getUploadSas(file.name, file.type);
      if (!mountedRef.current) return null;

      // Upload directly to Azure Blob Storage using XHR for real progress
      const { xhr, promise } = uploadToBlob(sasResponse.sasUrl, file, {
        onProgress: (percent) => {
          if (!mountedRef.current) return;
          setState((prev) => ({ ...prev, progress: percent }));
        },
      });
      xhrRef.current = xhr;

      await promise;

      if (!mountedRef.current) return null;

      await registerPhoto(sasResponse.blobUrl, file.name, file.type);
      if (!mountedRef.current) return null;

      setState({ isUploading: false, progress: 100, error: null });
      return sasResponse.blobUrl;
    } catch (err) {
      if (!mountedRef.current) return null;

      if (err instanceof Error && err.name === 'AbortError') {
        setState({ isUploading: false, progress: 0, error: null });
        return null;
      }

      const message = err instanceof Error ? err.message : 'Upload failed';
      setState({ isUploading: false, progress: 0, error: message });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return { ...state, upload, reset };
}
