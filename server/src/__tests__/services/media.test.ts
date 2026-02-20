/**
 * Media service tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock DB query functions
const mockGetPhotoById = jest.fn() as AnyMock;
const mockCreatePhotoRecord = jest.fn() as AnyMock;
const mockDeletePhotoById = jest.fn() as AnyMock;

// Mock Azure SDK
const mockGenerateBlobSASQueryParameters = jest.fn() as AnyMock;
const mockDeleteIfExists = jest.fn() as AnyMock;
const mockBlobExists = jest.fn() as AnyMock;
const mockGetProperties = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/media.js', () => ({
  getPhotoById: mockGetPhotoById,
  createPhoto: mockCreatePhotoRecord,
  deletePhotoById: mockDeletePhotoById,
}));

jest.unstable_mockModule('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn().mockImplementation(() => ({
    getContainerClient: jest.fn().mockReturnValue({
      getBlobClient: jest.fn().mockReturnValue({
        deleteIfExists: mockDeleteIfExists,
        exists: mockBlobExists,
        getProperties: mockGetProperties,
      }),
    }),
  })),
  StorageSharedKeyCredential: jest.fn().mockImplementation(() => ({})),
  generateBlobSASQueryParameters: mockGenerateBlobSASQueryParameters,
  BlobSASPermissions: { parse: jest.fn().mockReturnValue({}) },
  SASProtocol: { Https: 'https' },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocking
const { generateUploadSas, deletePhotoFromBlob, registerPhoto, removePhoto, isStorageConfigured } =
  await import('../../services/media.js');

// Fixture data
const PHOTO = {
  id: 'photo-1',
  blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/1234-abc-pic.jpg',
  filename: 'pic.jpg',
  contentType: 'image/jpeg',
  uploadedById: 'participant-a',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('Media Service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AZURE_STORAGE_ACCOUNT = 'bwwtstorage';
    process.env.AZURE_STORAGE_KEY = 'dGVzdGtleQ==';
    mockGenerateBlobSASQueryParameters.mockReturnValue({ toString: () => 'sas-token=abc' });
    mockDeleteIfExists.mockResolvedValue(undefined);
    mockBlobExists.mockResolvedValue(true);
    mockGetProperties.mockResolvedValue({ contentLength: 1024 });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ================================================================
  // isStorageConfigured
  // ================================================================
  describe('isStorageConfigured', () => {
    it('should return true when both env vars are set', () => {
      expect(isStorageConfigured()).toBe(true);
    });

    it('should return false when AZURE_STORAGE_ACCOUNT is missing', () => {
      delete process.env.AZURE_STORAGE_ACCOUNT;
      expect(isStorageConfigured()).toBe(false);
    });

    it('should return false when AZURE_STORAGE_KEY is missing', () => {
      delete process.env.AZURE_STORAGE_KEY;
      expect(isStorageConfigured()).toBe(false);
    });

    it('should return false when both env vars are missing', () => {
      delete process.env.AZURE_STORAGE_ACCOUNT;
      delete process.env.AZURE_STORAGE_KEY;
      expect(isStorageConfigured()).toBe(false);
    });
  });

  // ================================================================
  // generateUploadSas
  // ================================================================
  describe('generateUploadSas', () => {
    it('should return sasUrl, blobUrl, and expiresAt', async () => {
      const result = await generateUploadSas('vacation.jpg', 'image/jpeg');

      expect(result.sasUrl).toContain('https://bwwtstorage.blob.core.windows.net/photos/');
      expect(result.sasUrl).toContain('sas-token=abc');
      expect(result.blobUrl).toContain('https://bwwtstorage.blob.core.windows.net/photos/');
      expect(result.blobUrl).not.toContain('sas-token');
      expect(result.expiresAt).toBeDefined();
    });

    it('should generate unique blob names for same file', async () => {
      const result1 = await generateUploadSas('pic.jpg', 'image/jpeg');
      const result2 = await generateUploadSas('pic.jpg', 'image/jpeg');

      expect(result1.blobUrl).not.toBe(result2.blobUrl);
    });

    it('should sanitize filenames with special characters', async () => {
      const result = await generateUploadSas('my photo (1).jpg', 'image/jpeg');

      expect(result.blobUrl).not.toContain(' ');
      expect(result.blobUrl).not.toContain('(');
      expect(result.blobUrl).not.toContain(')');
      expect(result.blobUrl).toContain('.jpg');
    });

    it('should throw if Azure Storage is not configured', async () => {
      delete process.env.AZURE_STORAGE_ACCOUNT;
      delete process.env.AZURE_STORAGE_KEY;

      await expect(generateUploadSas('pic.jpg', 'image/jpeg')).rejects.toThrow(
        'Azure Storage not configured'
      );
    });
  });

  // ================================================================
  // registerPhoto
  // ================================================================
  describe('registerPhoto', () => {
    it('should create photo record in database', async () => {
      mockCreatePhotoRecord.mockResolvedValue(PHOTO);

      const result = await registerPhoto(
        PHOTO.blobUrl,
        PHOTO.filename,
        PHOTO.contentType,
        PHOTO.uploadedById
      );

      expect(result).toEqual(PHOTO);
      expect(mockCreatePhotoRecord).toHaveBeenCalledWith({
        blobUrl: PHOTO.blobUrl,
        filename: PHOTO.filename,
        contentType: PHOTO.contentType,
        uploadedById: PHOTO.uploadedById,
      });
    });
  });

  // ================================================================
  // deletePhotoFromBlob
  // ================================================================
  describe('deletePhotoFromBlob', () => {
    it('should delete blob from Azure storage', async () => {
      await deletePhotoFromBlob(PHOTO.blobUrl);

      expect(mockDeleteIfExists).toHaveBeenCalled();
    });

    it('should throw for invalid blob URL', async () => {
      await expect(deletePhotoFromBlob('not-a-url')).rejects.toThrow();
    });
  });

  // ================================================================
  // removePhoto
  // ================================================================
  describe('removePhoto', () => {
    it('should return null if photo does not exist', async () => {
      mockGetPhotoById.mockResolvedValue(null);

      const result = await removePhoto('nonexistent');

      expect(result).toBeNull();
      expect(mockDeleteIfExists).not.toHaveBeenCalled();
      expect(mockDeletePhotoById).not.toHaveBeenCalled();
    });

    it('should delete from blob storage and database', async () => {
      mockGetPhotoById.mockResolvedValue(PHOTO);
      mockDeletePhotoById.mockResolvedValue(PHOTO);

      const result = await removePhoto('photo-1');

      expect(result).toEqual(PHOTO);
      expect(mockDeleteIfExists).toHaveBeenCalled();
      expect(mockDeletePhotoById).toHaveBeenCalledWith('photo-1');
    });

    it('should continue deleting from DB even if blob deletion fails', async () => {
      mockGetPhotoById.mockResolvedValue(PHOTO);
      mockDeleteIfExists.mockRejectedValue(new Error('Blob not found'));
      mockDeletePhotoById.mockResolvedValue(PHOTO);

      const result = await removePhoto('photo-1');

      // Should still delete from DB despite blob failure
      expect(result).toEqual(PHOTO);
      expect(mockDeletePhotoById).toHaveBeenCalledWith('photo-1');
    });
  });
});
