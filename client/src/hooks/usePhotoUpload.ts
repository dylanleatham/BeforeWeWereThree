import { useState, useCallback, useRef } from 'react';
import { BlockBlobClient } from '@azure/storage-blob';
import { getUploadSas, registerPhoto } from '../services/api';

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
 * 2. Upload file directly to Azure using BlockBlobClient
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
  // AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useState(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  });

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

    // Create new abort controller for this upload
    abortControllerRef.current = new AbortController();

    try {
      // Get SAS token from API
      const sasResponse = await getUploadSas(file.name, file.type);

      if (!mountedRef.current) return null;

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      if (!mountedRef.current) return null;

      // Create BlockBlobClient with SAS URL
      const blockBlobClient = new BlockBlobClient(sasResponse.sasUrl);

      // Upload with progress tracking
      await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: {
          blobContentType: file.type,
        },
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
