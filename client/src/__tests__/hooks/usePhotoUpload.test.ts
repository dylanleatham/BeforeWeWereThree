/**
 * useMediaUpload hook tests (image-only mode with DB registration)
 * Previously usePhotoUpload — now uses unified useMediaUpload
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoist mock so it's available when vi.mock factory runs
const { mockUploadToBlob } = vi.hoisted(() => ({
  mockUploadToBlob: vi.fn().mockReturnValue({
    xhr: { abort: vi.fn() },
    promise: Promise.resolve(),
  }),
}));

// Mock blobUpload service
vi.mock('../../services/blobUpload', () => ({
  uploadToBlob: mockUploadToBlob,
}));

// Mock api module
vi.mock('../../services/api', () => ({
  getUploadSas: vi.fn(),
  registerPhoto: vi.fn(),
}));

import { getUploadSas, registerPhoto } from '../../services/api';
import { useMediaUpload } from '../../hooks/useMediaUpload';

const mockGetUploadSas = vi.mocked(getUploadSas);
const mockRegisterPhoto = vi.mocked(registerPhoto);

function createMockFile(name: string, type: string): File {
  return new File(['fake image data'], name, { type });
}

describe('useMediaUpload (image + registerInDatabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with no upload state', () => {
    const { result } = renderHook(() => useMediaUpload({ accept: 'image', registerInDatabase: true }));

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should reject non-image files', async () => {
    const { result } = renderHook(() => useMediaUpload({ accept: 'image', registerInDatabase: true }));

    const textFile = createMockFile('notes.txt', 'text/plain');

    let blobUrl: string | null = null;
    await act(async () => {
      blobUrl = await result.current.upload(textFile);
    });

    expect(blobUrl).toBeNull();
    expect(result.current.error).toBe('Only image files are allowed');
  });

  it('should upload image and return blob URL', async () => {
    mockGetUploadSas.mockResolvedValue({
      sasUrl: 'https://storage.blob.core.windows.net/photos/blob?sas=token',
      blobUrl: 'https://storage.blob.core.windows.net/photos/blob',
      expiresAt: '2026-01-01T01:00:00.000Z',
    });
    mockRegisterPhoto.mockResolvedValue({
      id: 'photo-1',
      blobUrl: 'https://storage.blob.core.windows.net/photos/blob',
      filename: 'pic.jpg',
      contentType: 'image/jpeg',
      uploadedById: 'participant-a',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const { result } = renderHook(() => useMediaUpload({ accept: 'image', registerInDatabase: true }));

    const imageFile = createMockFile('pic.jpg', 'image/jpeg');

    let blobUrl: string | null = null;
    await act(async () => {
      blobUrl = await result.current.upload(imageFile);
    });

    // Verify the SAS token was requested and photo was registered
    expect(mockGetUploadSas).toHaveBeenCalledWith('pic.jpg', 'image/jpeg', expect.any(AbortSignal));
    expect(mockUploadToBlob).toHaveBeenCalledWith(
      'https://storage.blob.core.windows.net/photos/blob?sas=token',
      imageFile,
      expect.objectContaining({ onProgress: expect.any(Function) })
    );
    expect(mockRegisterPhoto).toHaveBeenCalledWith(
      'https://storage.blob.core.windows.net/photos/blob',
      'pic.jpg',
      'image/jpeg'
    );
    expect(blobUrl).toBe('https://storage.blob.core.windows.net/photos/blob');
    expect(result.current.error).toBeNull();
  });

  it('should set error on SAS token failure', async () => {
    mockGetUploadSas.mockRejectedValue(new Error('Failed to get upload URL'));

    const { result } = renderHook(() => useMediaUpload({ accept: 'image', registerInDatabase: true }));

    const imageFile = createMockFile('pic.jpg', 'image/jpeg');

    let blobUrl: string | null = null;
    await act(async () => {
      blobUrl = await result.current.upload(imageFile);
    });

    expect(blobUrl).toBeNull();
    expect(result.current.error).toBe('Failed to get upload URL');
    expect(result.current.isUploading).toBe(false);
  });

  it('should reset state on reset()', async () => {
    mockGetUploadSas.mockRejectedValue(new Error('Upload error'));

    const { result } = renderHook(() => useMediaUpload({ accept: 'image', registerInDatabase: true }));

    const imageFile = createMockFile('pic.jpg', 'image/jpeg');

    await act(async () => {
      await result.current.upload(imageFile);
    });

    expect(result.current.error).toBe('Upload error');

    act(() => {
      result.current.reset();
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should not register in database when registerInDatabase is false', async () => {
    mockGetUploadSas.mockResolvedValue({
      sasUrl: 'https://storage.blob.core.windows.net/photos/blob?sas=token',
      blobUrl: 'https://storage.blob.core.windows.net/photos/blob',
      expiresAt: '2026-01-01T01:00:00.000Z',
    });

    const { result } = renderHook(() => useMediaUpload());

    const imageFile = createMockFile('pic.jpg', 'image/jpeg');

    await act(async () => {
      await result.current.upload(imageFile);
    });

    expect(mockRegisterPhoto).not.toHaveBeenCalled();
  });

  it('should accept video files in default (all) mode', async () => {
    mockGetUploadSas.mockResolvedValue({
      sasUrl: 'https://storage.blob.core.windows.net/photos/blob?sas=token',
      blobUrl: 'https://storage.blob.core.windows.net/photos/blob',
      expiresAt: '2026-01-01T01:00:00.000Z',
    });

    const { result } = renderHook(() => useMediaUpload());

    const videoFile = createMockFile('video.mp4', 'video/mp4');

    let blobUrl: string | null = null;
    await act(async () => {
      blobUrl = await result.current.upload(videoFile);
    });

    expect(blobUrl).toBe('https://storage.blob.core.windows.net/photos/blob');
  });
});
