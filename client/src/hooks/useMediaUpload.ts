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

export interface UseMediaUploadOptions {
  /** Which file types to accept. Defaults to 'all' (image/video/audio). */
  accept?: 'image' | 'all';
  /** Whether to register the upload in the Photo table. Defaults to false. */
  registerInDatabase?: boolean;
}

type AcceptType = NonNullable<UseMediaUploadOptions['accept']>;

const ACCEPT_VALIDATORS: Record<AcceptType, (type: string) => boolean> = {
  image: (type) => type.startsWith('image/'),
  all: (type) =>
    type.startsWith('image/') ||
    type.startsWith('video/') ||
    type.startsWith('audio/'),
};

const ACCEPT_ERROR: Record<AcceptType, string> = {
  image: 'Only image files are allowed',
  all: 'Only image, video, and audio files are allowed',
};

/**
 * Hook for uploading media directly to Azure Blob Storage
 *
 * Flow:
 * 1. Get SAS token from API
 * 2. Upload file directly to Azure using XHR (for real progress tracking)
 * 3. Optionally register in Photo table
 * 4. Return blob URL on success
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
  const { accept = 'all', registerInDatabase = false } = options;

  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const mountedRef = useRef(true);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track mount state — must set true in effect body for React strict mode,
  // which runs cleanup between the double-mount cycle in development.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
    };
  }, []);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    // Validate file type
    const isValid = ACCEPT_VALIDATORS[accept];
    if (!isValid(file.type)) {
      setState({ isUploading: false, progress: 0, error: ACCEPT_ERROR[accept] });
      return null;
    }

    setState({ isUploading: true, progress: 0, error: null });

    // Abort any in-progress upload before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (xhrRef.current) {
      xhrRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const sasResponse = await getUploadSas(file.name, file.type, controller.signal);
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

      // Optionally register in Photo table (couple's media library)
      if (registerInDatabase) {
        await registerPhoto(sasResponse.blobUrl, file.name, file.type);
        if (!mountedRef.current) return null;
      }

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
  }, [accept, registerInDatabase]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return { ...state, upload, reset };
}
