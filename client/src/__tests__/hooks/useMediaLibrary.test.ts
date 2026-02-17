/**
 * useMediaLibrary hook tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Photo } from 'shared';

// Mock api module
vi.mock('../../services/api', () => ({
  getPhotos: vi.fn(),
  deletePhoto: vi.fn(),
}));

import { getPhotos, deletePhoto } from '../../services/api';
import { useMediaLibrary } from '../../hooks/useMediaLibrary';

const mockGetPhotos = vi.mocked(getPhotos);
const mockDeletePhoto = vi.mocked(deletePhoto);

const PHOTOS: Photo[] = [
  {
    id: 'photo-1',
    blobUrl: 'https://storage.blob.core.windows.net/photos/pic1.jpg',
    filename: 'pic1.jpg',
    contentType: 'image/jpeg',
    uploadedById: 'participant-a',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'photo-2',
    blobUrl: 'https://storage.blob.core.windows.net/photos/pic2.jpg',
    filename: 'pic2.jpg',
    contentType: 'image/jpeg',
    uploadedById: 'participant-b',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('useMediaLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', () => {
    mockGetPhotos.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMediaLibrary());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.photos).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should load photos on mount', async () => {
    mockGetPhotos.mockResolvedValue(PHOTOS);

    const { result } = renderHook(() => useMediaLibrary());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.photos).toEqual(PHOTOS);
    expect(result.current.error).toBeNull();
  });

  it('should set error on fetch failure', async () => {
    mockGetPhotos.mockRejectedValue(new Error('Failed to load photos'));

    const { result } = renderHook(() => useMediaLibrary());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load photos');
    expect(result.current.photos).toEqual([]);
  });

  it('should refresh photos when refresh is called', async () => {
    mockGetPhotos.mockResolvedValue(PHOTOS);

    const { result } = renderHook(() => useMediaLibrary());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedPhotos = [...PHOTOS, {
      id: 'photo-3',
      blobUrl: 'https://storage.blob.core.windows.net/photos/pic3.jpg',
      filename: 'pic3.jpg',
      contentType: 'image/jpeg',
      uploadedById: 'participant-a',
      createdAt: '2026-01-03T00:00:00.000Z',
    }];
    mockGetPhotos.mockResolvedValue(updatedPhotos);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.photos).toHaveLength(3);
  });

  it('should optimistically remove photo on delete', async () => {
    mockGetPhotos.mockResolvedValue(PHOTOS);
    mockDeletePhoto.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMediaLibrary());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deletePhoto('photo-1');
    });

    expect(result.current.photos).toHaveLength(1);
    expect(result.current.photos[0]!.id).toBe('photo-2');
    expect(mockDeletePhoto).toHaveBeenCalledWith('photo-1');
  });

  it('should refresh list on delete failure', async () => {
    mockGetPhotos.mockResolvedValue(PHOTOS);
    mockDeletePhoto.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useMediaLibrary());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // After delete fails, refresh should restore original list
    mockGetPhotos.mockResolvedValue(PHOTOS);

    await act(async () => {
      await result.current.deletePhoto('photo-1');
    });

    // Should have re-fetched to restore accurate state
    expect(mockGetPhotos).toHaveBeenCalledTimes(2);
    // Photos should be restored to original list
    expect(result.current.photos).toHaveLength(2);
  });
});
