/**
 * useMediaUpload hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../services/api', () => ({
  getUploadSas: vi.fn(),
  registerPhoto: vi.fn(),
}));

vi.mock('../../services/blobUpload', () => ({
  uploadToBlob: vi.fn(),
}));

import { getUploadSas, registerPhoto } from '../../services/api';
import { uploadToBlob } from '../../services/blobUpload';
import { useMediaUpload } from '../../hooks/useMediaUpload';

const mockGetUploadSas = vi.mocked(getUploadSas);
const mockRegisterPhoto = vi.mocked(registerPhoto);
const mockUploadToBlob = vi.mocked(uploadToBlob);

const createFile = (name: string, type: string): File => {
  return new File(['content'], name, { type });
};

describe('useMediaUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMediaUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should reject invalid file types for image-only mode', async () => {
    const { result } = renderHook(() => useMediaUpload({ accept: 'image' }));

    let url: string | null = null;
    await act(async () => {
      url = await result.current.upload(createFile('video.mp4', 'video/mp4'));
    });

    expect(url).toBeNull();
    expect(result.current.error).toBe('Only image files are allowed');
    expect(mockGetUploadSas).not.toHaveBeenCalled();
  });

  it('should accept video files in all mode', async () => {
    const mockXhr = { abort: vi.fn() };
    mockGetUploadSas.mockResolvedValue({
      sasUrl: 'https://storage.blob.core.windows.net/photos/vid?token',
      blobUrl: 'https://storage.blob.core.windows.net/photos/vid',
      expiresAt: '2026-01-01T01:00:00.000Z',
    });
    mockUploadToBlob.mockReturnValue({
      xhr: mockXhr as unknown as XMLHttpRequest,
      promise: Promise.resolve(),
    });

    const { result } = renderHook(() => useMediaUpload({ accept: 'all' }));

    let url: string | null = null;
    await act(async () => {
      url = await result.current.upload(createFile('video.mp4', 'video/mp4'));
    });

    expect(url).toBe('https://storage.blob.core.windows.net/photos/vid');
  });

  it('should upload image successfully', async () => {
    const mockXhr = { abort: vi.fn() };
    mockGetUploadSas.mockResolvedValue({
      sasUrl: 'https://storage.blob.core.windows.net/photos/img?token',
      blobUrl: 'https://storage.blob.core.windows.net/photos/img',
      expiresAt: '2026-01-01T01:00:00.000Z',
    });
    mockUploadToBlob.mockReturnValue({
      xhr: mockXhr as unknown as XMLHttpRequest,
      promise: Promise.resolve(),
    });

    const { result } = renderHook(() => useMediaUpload());

    let url: string | null = null;
    await act(async () => {
      url = await result.current.upload(createFile('photo.jpg', 'image/jpeg'));
    });

    expect(url).toBe('https://storage.blob.core.windows.net/photos/img');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(100);
  });

  it('should register in database when option is set', async () => {
    const mockXhr = { abort: vi.fn() };
    mockGetUploadSas.mockResolvedValue({
      sasUrl: 'https://storage.blob.core.windows.net/photos/img?token',
      blobUrl: 'https://storage.blob.core.windows.net/photos/img',
      expiresAt: '2026-01-01T01:00:00.000Z',
    });
    mockUploadToBlob.mockReturnValue({
      xhr: mockXhr as unknown as XMLHttpRequest,
      promise: Promise.resolve(),
    });
    mockRegisterPhoto.mockResolvedValue({} as never);

    const { result } = renderHook(() =>
      useMediaUpload({ registerInDatabase: true })
    );

    await act(async () => {
      await result.current.upload(createFile('photo.jpg', 'image/jpeg'));
    });

    expect(mockRegisterPhoto).toHaveBeenCalledWith(
      'https://storage.blob.core.windows.net/photos/img',
      'photo.jpg',
      'image/jpeg'
    );
  });

  it('should not register in database by default', async () => {
    const mockXhr = { abort: vi.fn() };
    mockGetUploadSas.mockResolvedValue({
      sasUrl: 'https://storage.blob.core.windows.net/photos/img?token',
      blobUrl: 'https://storage.blob.core.windows.net/photos/img',
      expiresAt: '2026-01-01T01:00:00.000Z',
    });
    mockUploadToBlob.mockReturnValue({
      xhr: mockXhr as unknown as XMLHttpRequest,
      promise: Promise.resolve(),
    });

    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.upload(createFile('photo.jpg', 'image/jpeg'));
    });

    expect(mockRegisterPhoto).not.toHaveBeenCalled();
  });

  it('should set error on upload failure', async () => {
    mockGetUploadSas.mockRejectedValue(new Error('SAS token failed'));

    const { result } = renderHook(() => useMediaUpload());

    let url: string | null = 'not-null';
    await act(async () => {
      url = await result.current.upload(createFile('photo.jpg', 'image/jpeg'));
    });

    expect(url).toBeNull();
    expect(result.current.error).toBe('SAS token failed');
    expect(result.current.isUploading).toBe(false);
  });

  it('should reset state', async () => {
    mockGetUploadSas.mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useMediaUpload());

    await act(async () => {
      await result.current.upload(createFile('photo.jpg', 'image/jpeg'));
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });
});
