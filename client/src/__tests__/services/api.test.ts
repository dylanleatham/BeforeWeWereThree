/**
 * API service tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validatePin, getSession, logout } from '../../services/api';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validatePin', () => {
    it('should call fetch with correct parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              role: 'guest',
              participantId: 'test-id',
              designation: 'A',
            },
          }),
      });

      await validatePin('01152025', 'test-fingerprint');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/validate-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: '01152025', deviceFingerprint: 'test-fingerprint' }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return success response when PIN is valid', async () => {
      const mockResponse = {
        success: true,
        data: {
          role: 'guest' as const,
          participantId: 'test-id',
          designation: 'A' as const,
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await validatePin('01152025', 'test-fp');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('guest');
        expect(result.data.participantId).toBe('test-id');
      }
    });

    it('should return error response when PIN is invalid', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'INVALID_PIN',
          message: 'Invalid PIN',
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await validatePin('wrong-pin', 'test-fp');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_PIN');
      }
    });

    it('should return network error when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await validatePin('01152025', 'test-fp');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NETWORK_ERROR');
        expect(result.error.message).toBe('Unable to connect to server');
      }
    });
  });

  describe('getSession', () => {
    it('should call fetch with correct parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              participantId: 'test-id',
              role: 'guest',
              designation: 'A',
              expiresAt: new Date().toISOString(),
            },
          }),
      });

      await getSession();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/session', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return session data when authenticated', async () => {
      const mockResponse = {
        success: true,
        data: {
          participantId: 'test-id',
          role: 'admin' as const,
          designation: null,
          expiresAt: '2025-01-15T00:00:00Z',
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getSession();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('admin');
      }
    });

    it('should return error when not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
          }),
      });

      const result = await getSession();

      expect(result.success).toBe(false);
    });
  });

  describe('logout', () => {
    it('should call fetch with POST method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { message: 'Logged out' },
          }),
      });

      await logout();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return success response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { message: 'Logged out' },
          }),
      });

      const result = await logout();

      expect(result.success).toBe(true);
    });
  });
});
