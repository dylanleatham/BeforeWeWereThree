/**
 * Session service tests
 */

import { describe, it, expect } from '@jest/globals';
import { createSession, verifySession, getSessionExpiration } from '../../services/session.js';

describe('Session Service', () => {
  const testParticipantId = 'test-participant-id';
  const testFingerprint = 'test-fingerprint';

  describe('createSession', () => {
    it('should create a valid JWT for guest role', async () => {
      const token = await createSession(testParticipantId, 'guest', testFingerprint, 'A');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should create a valid JWT for admin role', async () => {
      const token = await createSession(testParticipantId, 'admin', testFingerprint, null);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create different tokens for different participants', async () => {
      const token1 = await createSession('participant-1', 'guest', 'fp-1', 'A');
      const token2 = await createSession('participant-2', 'guest', 'fp-2', 'B');

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifySession', () => {
    it('should verify a valid token and return session payload', async () => {
      const token = await createSession(testParticipantId, 'guest', testFingerprint, 'A');
      const session = await verifySession(token);

      expect(session).toEqual({
        participantId: testParticipantId,
        role: 'guest',
        deviceFingerprint: testFingerprint,
        designation: 'A',
      });
    });

    it('should verify admin token with null designation', async () => {
      const token = await createSession(testParticipantId, 'admin', testFingerprint, null);
      const session = await verifySession(token);

      expect(session.role).toBe('admin');
      expect(session.designation).toBeNull();
    });

    it('should throw error for invalid token', async () => {
      await expect(verifySession('invalid-token')).rejects.toThrow();
    });

    it('should throw error for tampered token', async () => {
      const token = await createSession(testParticipantId, 'guest', testFingerprint, 'A');
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      await expect(verifySession(tamperedToken)).rejects.toThrow();
    });
  });

  describe('getSessionExpiration', () => {
    it('should return a date in the future', () => {
      const expiration = getSessionExpiration();

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return date approximately 30 days from now', () => {
      const expiration = getSessionExpiration();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Allow 1 minute tolerance
      const diff = Math.abs(expiration.getTime() - thirtyDaysFromNow.getTime());
      expect(diff).toBeLessThan(60 * 1000);
    });
  });
});
