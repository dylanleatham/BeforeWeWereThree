import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import type { SessionPayload, Role, Designation } from 'shared';

/**
 * JWT session service for Before We Were Three
 * Uses jose library (ESM-native, Edge-compatible)
 *
 * Session duration: 30 days per CONTEXT.md
 * Algorithm: HS256
 */

// Fail fast if JWT_SECRET is not set outside development
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'development') {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-in-production';
const SESSION_DURATION_DAYS = 30;

// Encode secret for jose
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

/**
 * JWT payload structure (extends jose JWTPayload)
 */
interface TokenPayload extends JWTPayload {
  participantId: string;
  role: Role;
  deviceFingerprint: string;
  designation: Designation | null;
  friendId?: string;
}

/**
 * Create a new JWT session token
 * @param participantId - Unique participant identifier
 * @param role - 'guest', 'admin', or 'friend'
 * @param deviceFingerprint - Device fingerprint for identification
 * @param designation - 'A', 'B', 'readonly', or null for admin
 * @param friendId - Optional friend ID for friend role
 * @returns JWT token string
 */
export async function createSession(
  participantId: string,
  role: Role,
  deviceFingerprint: string,
  designation: Designation | null,
  friendId?: string
): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const payload: Record<string, unknown> = {
    participantId,
    role,
    deviceFingerprint,
    designation,
  };

  if (friendId) {
    payload.friendId = friendId;
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  return token;
}

/**
 * Verify a JWT session token
 * @param token - JWT token string
 * @returns SessionPayload if valid
 * @throws Error if token is invalid or expired
 */
export async function verifySession(token: string): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const tokenPayload = payload as TokenPayload;

    // Validate required fields
    if (!tokenPayload.participantId || !tokenPayload.role || !tokenPayload.deviceFingerprint) {
      throw new Error('Invalid token payload');
    }

    return {
      participantId: tokenPayload.participantId,
      role: tokenPayload.role as Role,
      deviceFingerprint: tokenPayload.deviceFingerprint,
      designation: tokenPayload.designation as Designation | null,
      friendId: tokenPayload.friendId as string | undefined,
    };
  } catch {
    throw new Error('Invalid or expired session');
  }
}

/**
 * Get session expiration date (30 days from now)
 */
export function getSessionExpiration(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  return expiresAt;
}

/**
 * Session cookie options
 * Per research: httpOnly, secure, sameSite strict
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000, // 30 days in ms
  path: '/',
};
