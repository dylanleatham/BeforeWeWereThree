import { z } from 'zod';

/**
 * Authentication types for Before We Were Three
 * PIN-based auth with JWT sessions and device fingerprinting
 */

/**
 * Valid roles in the application
 */
export type Role = 'guest' | 'admin' | 'friend';

/**
 * Participant designations for guest role
 * - A and B are the two main participants
 * - readonly is for additional devices (3rd+)
 */
export type Designation = 'A' | 'B' | 'readonly';

/**
 * PIN schema: 8 digits in MMDDYYYY format
 * Validates format is a valid date
 */
export const pinSchema = z
  .string()
  .length(8, 'PIN must be exactly 8 digits')
  .regex(/^\d{8}$/, 'PIN must contain only digits')
  .refine(
    (pin) => {
      const month = parseInt(pin.substring(0, 2), 10);
      const day = parseInt(pin.substring(2, 4), 10);
      const year = parseInt(pin.substring(4, 8), 10);
      // Basic validation: month 1-12, day 1-31, reasonable year range
      return month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100;
    },
    { message: 'PIN must be a valid date in MMDDYYYY format' }
  );

/**
 * Validate PIN request schema
 */
export const validatePinRequestSchema = z.object({
  pin: pinSchema,
  deviceFingerprint: z
    .string()
    .min(1, 'Device fingerprint is required')
    .max(512, 'Device fingerprint exceeds maximum length'),
});

export type ValidatePinRequest = z.infer<typeof validatePinRequestSchema>;

/**
 * Validate PIN response data
 */
export interface ValidatePinResponse {
  role: Role;
  participantId: string;
  designation: Designation | null;
  friendId?: string;
}

/**
 * JWT session payload stored in token
 */
export interface SessionPayload {
  participantId: string;
  role: Role;
  deviceFingerprint: string;
  designation: Designation | null;
  friendId?: string;
}

/**
 * Session response for GET /api/auth/session
 */
export interface SessionResponse {
  role: Role;
  participantId: string;
  designation: Designation | null;
  friendId?: string;
  expiresAt: string;
}

/**
 * Participant type matching Prisma model
 * Note: designation is nullable for admin participants
 */
export interface Participant {
  id: string;
  deviceFingerprint: string;
  designation: Designation | null;
  role: Role;
  createdAt: Date;
}
