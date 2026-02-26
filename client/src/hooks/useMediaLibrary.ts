import { useState, useEffect, useCallback, useRef } from 'react';
import type { Photo } from 'shared';
import { getPhotos, deletePhoto as apiDeletePhoto } from '../services/api';

interface UseMediaLibraryReturn {
  /** List of photos */
  photos: Photo[];
  /** Whether photos are loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh the photo list */
  refresh: () => Promise<void>;
  /** Delete a photo and refresh the list */
  deletePhoto: (id: string) => Promise<void>;
}

/**
 * Hook for managing the media library (photo list)
 *
 * Fetches photos on mount and provides refresh/delete operations.
 *
 * @example
 * const { photos, isLoading, error, refresh, deletePhoto } = useMediaLibrary();
 */
export function useMediaLibrary(): UseMediaLibraryReturn {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedPhotos = await getPhotos();
      if (!mountedRef.current) return;
      setPhotos(fetchedPhotos);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load photos';
      setError(message);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const deletePhoto = useCallback(async (id: string) => {
    try {
      await apiDeletePhoto(id);
      if (!mountedRef.current) return;
      // Optimistically remove from list
      setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to delete photo';
      setError(message);
      // Refresh to get accurate state
      await refresh();
    }
  }, [refresh]);

  return {
    photos,
    isLoading,
    error,
    refresh,
    deletePhoto,
  };
}
