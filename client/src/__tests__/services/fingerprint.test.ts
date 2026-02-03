/**
 * Fingerprint service tests
 *
 * Note: Due to module-level caching in the fingerprint service,
 * we use resetModules to get fresh instances for tests that need
 * to test error/fallback behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Fingerprint Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return fingerprint from FingerprintJS', async () => {
    const mockAgent = { get: vi.fn().mockResolvedValue({ visitorId: 'test-visitor-id-123' }) };
    vi.doMock('@fingerprintjs/fingerprintjs', () => ({
      default: { load: vi.fn().mockResolvedValue(mockAgent) },
    }));

    const { getDeviceFingerprint } = await import('../../services/fingerprint');
    const result = await getDeviceFingerprint();

    expect(result).toBe('test-visitor-id-123');
  });

  it('should cache fingerprint and return cached value on subsequent calls', async () => {
    const mockAgent = { get: vi.fn().mockResolvedValue({ visitorId: 'cached-fingerprint' }) };
    vi.doMock('@fingerprintjs/fingerprintjs', () => ({
      default: { load: vi.fn().mockResolvedValue(mockAgent) },
    }));

    const { getDeviceFingerprint } = await import('../../services/fingerprint');

    const result1 = await getDeviceFingerprint();
    const result2 = await getDeviceFingerprint();
    const result3 = await getDeviceFingerprint();

    expect(result1).toBe('cached-fingerprint');
    expect(result2).toBe('cached-fingerprint');
    expect(result3).toBe('cached-fingerprint');
    // Should only call agent.get once due to caching
    expect(mockAgent.get).toHaveBeenCalledTimes(1);
  });

  it('should return fallback fingerprint when FingerprintJS.load fails', async () => {
    vi.doMock('@fingerprintjs/fingerprintjs', () => ({
      default: { load: vi.fn().mockRejectedValue(new Error('FingerprintJS failed')) },
    }));

    const { getDeviceFingerprint } = await import('../../services/fingerprint');
    const result = await getDeviceFingerprint();

    expect(result).toMatch(/^fallback-\d+-[a-z0-9]+$/);
    expect(console.error).toHaveBeenCalledWith(
      'Fingerprinting failed, using fallback:',
      expect.any(Error)
    );
  });

  it('should return fallback fingerprint when agent.get fails', async () => {
    const mockAgent = { get: vi.fn().mockRejectedValue(new Error('Agent get failed')) };
    vi.doMock('@fingerprintjs/fingerprintjs', () => ({
      default: { load: vi.fn().mockResolvedValue(mockAgent) },
    }));

    const { getDeviceFingerprint } = await import('../../services/fingerprint');
    const result = await getDeviceFingerprint();

    expect(result).toMatch(/^fallback-\d+-[a-z0-9]+$/);
  });

  it('should cache fallback fingerprint', async () => {
    const mockLoad = vi.fn().mockRejectedValue(new Error('Failed'));
    vi.doMock('@fingerprintjs/fingerprintjs', () => ({
      default: { load: mockLoad },
    }));

    const { getDeviceFingerprint } = await import('../../services/fingerprint');

    const result1 = await getDeviceFingerprint();
    const result2 = await getDeviceFingerprint();

    expect(result1).toBe(result2);
    expect(result1).toMatch(/^fallback-\d+-[a-z0-9]+$/);
  });

  it('should clear cached fingerprint', async () => {
    const mockAgent = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ visitorId: 'first-fingerprint' })
        .mockResolvedValueOnce({ visitorId: 'second-fingerprint' }),
    };
    vi.doMock('@fingerprintjs/fingerprintjs', () => ({
      default: { load: vi.fn().mockResolvedValue(mockAgent) },
    }));

    const { getDeviceFingerprint, clearCachedFingerprint } = await import(
      '../../services/fingerprint'
    );

    const result1 = await getDeviceFingerprint();
    expect(result1).toBe('first-fingerprint');

    clearCachedFingerprint();

    const result2 = await getDeviceFingerprint();
    expect(result2).toBe('second-fingerprint');
  });
});
