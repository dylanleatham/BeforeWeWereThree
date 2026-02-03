/**
 * useSession hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSession } from '../../hooks/useSession';

// Mock the API and fingerprint services
vi.mock('../../services/api', () => ({
  validatePin: vi.fn(),
  getSession: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../services/fingerprint', () => ({
  getDeviceFingerprint: vi.fn(),
}));

import * as api from '../../services/api';
import * as fingerprint from '../../services/fingerprint';

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fingerprint.getDeviceFingerprint).mockResolvedValue('test-fingerprint');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with loading state and check for existing session', async () => {
      vi.mocked(api.getSession).mockResolvedValue({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });

      const { result } = renderHook(() => useSession());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);

      // Wait for session check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(api.getSession).toHaveBeenCalled();
    });

    it('should restore existing session if valid', async () => {
      vi.mocked(api.getSession).mockResolvedValue({
        success: true,
        data: {
          participantId: 'existing-id',
          role: 'guest',
          designation: 'A',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.role).toBe('guest');
      expect(result.current.participantId).toBe('existing-id');
      expect(result.current.designation).toBe('A');
    });

    it('should handle session check failure gracefully', async () => {
      vi.mocked(api.getSession).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      vi.mocked(api.getSession).mockResolvedValue({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    });

    it('should login successfully with valid PIN', async () => {
      vi.mocked(api.validatePin).mockResolvedValue({
        success: true,
        data: {
          role: 'guest',
          participantId: 'new-participant',
          designation: 'B',
        },
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.login('01152025');
      });

      expect(loginResult!.success).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.role).toBe('guest');
      expect(result.current.participantId).toBe('new-participant');
      expect(result.current.designation).toBe('B');
      expect(fingerprint.getDeviceFingerprint).toHaveBeenCalled();
    });

    it('should login as admin with admin PIN', async () => {
      vi.mocked(api.validatePin).mockResolvedValue({
        success: true,
        data: {
          role: 'admin',
          participantId: 'admin-id',
          designation: null,
        },
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('12251990');
      });

      expect(result.current.role).toBe('admin');
      expect(result.current.designation).toBeNull();
    });

    it('should return error for invalid PIN', async () => {
      vi.mocked(api.validatePin).mockResolvedValue({
        success: false,
        error: { code: 'INVALID_PIN', message: 'Invalid PIN' },
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.login('wrong-pin');
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBe('Invalid PIN');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid PIN');
    });

    it('should handle network errors during login', async () => {
      vi.mocked(fingerprint.getDeviceFingerprint).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.login('01152025');
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBe('Unable to connect to server');
    });
  });

  describe('logout', () => {
    it('should clear session state on logout', async () => {
      vi.mocked(api.getSession).mockResolvedValue({
        success: true,
        data: {
          participantId: 'test-id',
          role: 'guest',
          designation: 'A',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });
      vi.mocked(api.logout).mockResolvedValue({
        success: true,
        data: { message: 'Logged out' },
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.role).toBeNull();
      expect(result.current.participantId).toBeNull();
      expect(result.current.designation).toBeNull();
      expect(api.logout).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      vi.mocked(api.getSession).mockResolvedValue({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      vi.mocked(api.validatePin).mockResolvedValue({
        success: false,
        error: { code: 'INVALID_PIN', message: 'Wrong PIN' },
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('wrong');
      });

      expect(result.current.error).toBe('Wrong PIN');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
