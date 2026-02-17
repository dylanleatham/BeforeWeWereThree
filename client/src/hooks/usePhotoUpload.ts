import { useState, useCallback, useRef, useEffect } from 'react';
import { getUploadSas, registerPhoto } from '../services/api';
import { uploadToBlob } from '../services/blobUpload';

interface UploadState {
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Upload progress (0-100) */
  progress: number;
  /** Error message if upload failed */
  error: string | null;
}

interface UsePhotoUploadReturn extends UploadState {
  /** Upload a file to Azure Blob Storage */
  upload: (file: File) => Promise<string | null>;
  /** Reset upload state */
  reset: () => void;
}

/**
 * Hook for uploading photos directly to Azure Blob Storage
 *
 * Flow:
 * 1. Get SAS token from API
 * 2. Upload file directly to Azure using XHR (for real progress tracking)
 * 3. Register photo in database
 * 4. Return blob URL on success
 *
 * @example
 * const { upload, isUploading, progress, error } = usePhotoUpload();
 * const blobUrl = await upload(file);
 */
export function usePhotoUpload(): UsePhotoUploadReturn {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  // Store XHR for cancellation during upload
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
    if (!file.type.startsWith('image/')) {
      setState({
        isUploading: false,
        progress: 0,
        error: 'Only image files are allowed',
      });
      return null;
    }

    // Start upload
    setState({
      isUploading: true,
      progress: 0,
      error: null,
    });

    // Abort any in-progress upload before starting a new one
    if (xhrRef.current) {
      xhrRef.current.abort();
    }

    try {
      // Get SAS token from API
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

      // Register photo in database
      await registerPhoto(sasResponse.blobUrl, file.name, file.type);

      if (!mountedRef.current) return null;

      // Success
      setState({
        isUploading: false,
        progress: 100,
        error: null,
      });

      return sasResponse.blobUrl;
    } catch (err) {
      if (!mountedRef.current) return null;

      // Handle abort
      if (err instanceof Error && err.name === 'AbortError') {
        setState({
          isUploading: false,
          progress: 0,
          error: null,
        });
        return null;
      }

      // Handle error
      const message = err instanceof Error ? err.message : 'Upload failed';
      setState({
        isUploading: false,
        progress: 0,
        error: message,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    // Cancel any in-progress upload
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setState({
      isUploading: false,
      progress: 0,
      error: null,
    });
  }, []);

  return {
    ...state,
    upload,
    reset,
  };
}
