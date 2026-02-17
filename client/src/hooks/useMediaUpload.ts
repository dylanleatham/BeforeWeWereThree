import { useState, useCallback, useRef, useEffect } from 'react';
import { BlockBlobClient } from '@azure/storage-blob';
import { getUploadSas, registerPhoto } from '../services/api';

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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
    abortControllerRef.current = new AbortController();

    try {
      const sasResponse = await getUploadSas(file.name, file.type);
      if (!mountedRef.current) return null;

      const arrayBuffer = await file.arrayBuffer();
      if (!mountedRef.current) return null;

      const blockBlobClient = new BlockBlobClient(sasResponse.sasUrl);

      await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: { blobContentType: file.type },
        onProgress: (progress) => {
          if (!mountedRef.current) return;
          const percent = Math.round(
            (progress.loadedBytes / arrayBuffer.byteLength) * 100
          );
          setState((prev) => ({ ...prev, progress: percent }));
        },
        abortSignal: abortControllerRef.current.signal,
      });

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return { ...state, upload, reset };
}
