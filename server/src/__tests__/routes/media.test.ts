/**
 * Media routes integration tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

type AnyMock = jest.Mock<any>;

const mockParticipant = {
  findUnique: jest.fn<() => Promise<unknown>>(),
  count: jest.fn<() => Promise<number>>(),
  create: jest.fn<() => Promise<unknown>>(),
  update: jest.fn<() => Promise<unknown>>(),
};

const mockFriend = {
  findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
};

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    participant: mockParticipant,
    friend: mockFriend,
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => {
      return callback({ participant: mockParticipant });
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  disconnectDatabase: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../db/queries/config.js', () => ({
  getGuestPin: jest.fn<() => Promise<string>>().mockResolvedValue('01152025'),
  getAdminPin: jest.fn<() => Promise<string>>().mockResolvedValue('12251990'),
  getBabymoonClosedAt: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
  setBabymoonClosedAt: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  deleteBabymoonClosedAt: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../middleware/rateLimit.js', () => ({
  pinRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  resetRateLimit: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getRemainingAttempts: jest.fn<() => Promise<number>>().mockResolvedValue(5),
  createRateLimiter: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

// Mock media service
const mockGenerateUploadSas = jest.fn() as AnyMock;
const mockRegisterPhoto = jest.fn() as AnyMock;
const mockRemovePhoto = jest.fn() as AnyMock;
const mockIsStorageConfigured = jest.fn() as AnyMock;

jest.unstable_mockModule('../../services/media.js', () => ({
  generateUploadSas: mockGenerateUploadSas,
  registerPhoto: mockRegisterPhoto,
  removePhoto: mockRemovePhoto,
  isStorageConfigured: mockIsStorageConfigured,
}));

// Mock media query functions
const mockGetPhotoById = jest.fn() as AnyMock;
const mockGetAllPhotos = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/media.js', () => ({
  getPhotoById: mockGetPhotoById,
  getAllPhotos: mockGetAllPhotos,
}));

const { default: request } = await import('supertest');
const { app } = await import('../../index.js');

const mockAdminParticipant = {
  id: 'admin-id',
  deviceFingerprint: 'admin-fp',
  designation: 'readonly',
  role: 'admin',
  createdAt: new Date('2024-01-01'),
};

const mockGuestParticipant = {
  id: 'guest-id',
  deviceFingerprint: 'guest-fp',
  designation: 'A',
  role: 'guest',
  createdAt: new Date('2024-01-01'),
};

async function getAdminCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.create.mockResolvedValue(mockAdminParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '12251990', deviceFingerprint: 'admin-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

async function getGuestCookies(): Promise<string[]> {
  mockParticipant.findUnique.mockResolvedValue(null);
  mockParticipant.count.mockResolvedValue(0);
  mockParticipant.create.mockResolvedValue(mockGuestParticipant);

  const res = await request(app)
    .post('/api/auth/validate-pin')
    .send({ pin: '01152025', deviceFingerprint: 'guest-fp' });
  return res.headers['set-cookie'] as unknown as string[];
}

const mockPhoto = {
  id: 'photo-1',
  blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/test.jpg',
  filename: 'test.jpg',
  contentType: 'image/jpeg',
  uploadedById: 'guest-id',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('Media Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriend.findUnique.mockResolvedValue(null);
  });

  // ================================================================
  // POST /api/media/sas
  // ================================================================
  describe('POST /api/media/sas', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/media/sas')
        .send({ filename: 'photo.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(401);
    });

    it('should return 503 if storage is not configured', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockIsStorageConfigured.mockReturnValue(false);

      const res = await request(app)
        .post('/api/media/sas')
        .set('Cookie', cookies)
        .send({ filename: 'photo.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should return 400 for invalid request body', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockIsStorageConfigured.mockReturnValue(true);

      const res = await request(app)
        .post('/api/media/sas')
        .set('Cookie', cookies)
        .send({ filename: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for unsupported content type', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockIsStorageConfigured.mockReturnValue(true);

      const res = await request(app)
        .post('/api/media/sas')
        .set('Cookie', cookies)
        .send({ filename: 'file.txt', contentType: 'text/plain' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should generate SAS token for valid request', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockIsStorageConfigured.mockReturnValue(true);
      mockGenerateUploadSas.mockResolvedValue({
        sasUrl: 'https://bwwtstorage.blob.core.windows.net/photos/uuid.jpg?sv=...',
        blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/uuid.jpg',
      });

      const res = await request(app)
        .post('/api/media/sas')
        .set('Cookie', cookies)
        .send({ filename: 'photo.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sasUrl).toBeDefined();
      expect(res.body.data.blobUrl).toBeDefined();
    });

    it('should return 500 if SAS generation fails', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockIsStorageConfigured.mockReturnValue(true);
      mockGenerateUploadSas.mockRejectedValue(new Error('Azure error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/media/sas')
        .set('Cookie', cookies)
        .send({ filename: 'photo.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // POST /api/media/register
  // ================================================================
  describe('POST /api/media/register', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/media/register')
        .send({
          blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/test.jpg',
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid request body', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .post('/api/media/register')
        .set('Cookie', cookies)
        .send({ blobUrl: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid blob URL', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockRegisterPhoto.mockRejectedValue(new Error('INVALID_BLOB_URL'));

      const res = await request(app)
        .post('/api/media/register')
        .set('Cookie', cookies)
        .send({
          blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/test.jpg',
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for blob not found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockRegisterPhoto.mockRejectedValue(new Error('BLOB_NOT_FOUND'));

      const res = await request(app)
        .post('/api/media/register')
        .set('Cookie', cookies)
        .send({
          blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/test.jpg',
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 413 for blob too large', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockRegisterPhoto.mockRejectedValue(new Error('BLOB_TOO_LARGE'));

      const res = await request(app)
        .post('/api/media/register')
        .set('Cookie', cookies)
        .send({
          blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/test.jpg',
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate photo', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockRegisterPhoto.mockRejectedValue(new Error('Unique constraint failed'));

      const res = await request(app)
        .post('/api/media/register')
        .set('Cookie', cookies)
        .send({
          blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/test.jpg',
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PHOTO_EXISTS');
    });

    it('should register photo successfully', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockRegisterPhoto.mockResolvedValue(mockPhoto);

      const res = await request(app)
        .post('/api/media/register')
        .set('Cookie', cookies)
        .send({
          blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/test.jpg',
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.photo.id).toBe('photo-1');
    });

    it('should return 500 for unexpected errors', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockRegisterPhoto.mockRejectedValue(new Error('Unexpected failure'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/media/register')
        .set('Cookie', cookies)
        .send({
          blobUrl: 'https://bwwtstorage.blob.core.windows.net/photos/test.jpg',
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // GET /api/media
  // ================================================================
  describe('GET /api/media', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/media');
      expect(res.status).toBe(401);
    });

    it('should return photos list for authenticated user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetAllPhotos.mockResolvedValue({ photos: [mockPhoto], total: 1 });

      const res = await request(app)
        .get('/api/media')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.photos).toHaveLength(1);
    });

    it('should return 500 if query fails', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetAllPhotos.mockRejectedValue(new Error('DB error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .get('/api/media')
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  // ================================================================
  // GET /api/media/:id
  // ================================================================
  describe('GET /api/media/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/media/photo-1');
      expect(res.status).toBe(401);
    });

    it('should return 404 if photo not found', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetPhotoById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/media/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PHOTO_NOT_FOUND');
    });

    it('should return photo by ID', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);
      mockGetPhotoById.mockResolvedValue(mockPhoto);

      const res = await request(app)
        .get('/api/media/photo-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.photo.id).toBe('photo-1');
    });
  });

  // ================================================================
  // DELETE /api/media/:id
  // ================================================================
  describe('DELETE /api/media/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete('/api/media/photo-1');
      expect(res.status).toBe(401);
    });

    it('should return 403 for guest user', async () => {
      const cookies = await getGuestCookies();
      mockParticipant.findUnique.mockResolvedValue(mockGuestParticipant);

      const res = await request(app)
        .delete('/api/media/photo-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 if photo not found', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockRemovePhoto.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/media/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PHOTO_NOT_FOUND');
    });

    it('should delete photo for admin', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockRemovePhoto.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/media/photo-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 500 if deletion fails', async () => {
      const cookies = await getAdminCookies();
      mockParticipant.findUnique.mockResolvedValue(mockAdminParticipant);
      mockRemovePhoto.mockRejectedValue(new Error('Azure error'));

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .delete('/api/media/photo-1')
        .set('Cookie', cookies);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });
});
