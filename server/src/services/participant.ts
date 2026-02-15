import { db } from '../db/connection.js';
import type { Role, Designation } from 'shared';

/**
 * Participant service for Before We Were Three
 * Handles participant assignment based on device fingerprint
 *
 * Logic per CONTEXT.md:
 * - Admin role returns 'admin' (no participant distinction)
 * - First guest device becomes 'A'
 * - Second guest device becomes 'B'
 * - Third+ device becomes 'readonly'
 */

interface ParticipantResult {
  participantId: string;
  designation: Designation | null;
}

/**
 * Get or create a participant based on device fingerprint
 * @param fingerprint - Device fingerprint from client
 * @param role - 'guest' or 'admin'
 * @returns Participant ID and designation
 */
export async function getOrCreateParticipant(
  fingerprint: string,
  role: Role
): Promise<ParticipantResult> {
  // Admin role - create/get admin participant (no A/B designation)
  if (role === 'admin') {
    const existing = await db.participant.findUnique({
      where: { deviceFingerprint: fingerprint },
    });

    if (existing) {
      // Update to admin role if needed
      if (existing.role !== 'admin') {
        await db.participant.update({
          where: { id: existing.id },
          data: { role: 'admin', designation: 'readonly' }, // Admin uses readonly as placeholder
        });
      }
      return { participantId: existing.id, designation: null };
    }

    // Create new admin participant
    const newAdmin = await db.participant.create({
      data: {
        deviceFingerprint: fingerprint,
        designation: 'readonly', // Admin uses readonly as placeholder
        role: 'admin',
      },
    });
    return { participantId: newAdmin.id, designation: null };
  }

  // Guest role - check for existing GUEST participant with this fingerprint
  const existing = await db.participant.findUnique({
    where: { deviceFingerprint: fingerprint },
  });

  // If existing participant is a guest, return it
  if (existing && existing.role === 'guest') {
    return {
      participantId: existing.id,
      designation: existing.designation as Designation,
    };
  }

  // If existing is admin, convert to guest with proper designation
  // (Don't delete - would violate FK constraints from votes/letters)
  if (existing && existing.role === 'admin') {
    const updatedParticipant = await db.$transaction(async (tx) => {
      // Count existing guest participants to determine designation
      const guestCount = await tx.participant.count({
        where: { role: 'guest' },
      });

      // Determine designation based on order
      let designation: Designation;
      if (guestCount === 0) {
        designation = 'A';
      } else if (guestCount === 1) {
        designation = 'B';
      } else {
        designation = 'readonly';
      }

      // Update existing participant to guest role
      return tx.participant.update({
        where: { id: existing.id },
        data: {
          designation,
          role: 'guest',
        },
      });
    }, { isolationLevel: 'Serializable' });

    return {
      participantId: updatedParticipant.id,
      designation: updatedParticipant.designation as Designation,
    };
  }

  // Use Serializable isolation to prevent race condition when two devices login simultaneously.
  // Without it, two concurrent transactions can both read guestCount === 0 and both assign 'A'.
  const newParticipant = await db.$transaction(async (tx) => {
    // Count existing guest participants to determine designation
    const guestCount = await tx.participant.count({
      where: { role: 'guest' },
    });

    // Determine designation based on order
    let designation: Designation;
    if (guestCount === 0) {
      designation = 'A';
    } else if (guestCount === 1) {
      designation = 'B';
    } else {
      designation = 'readonly';
    }

    // Create new guest participant
    return tx.participant.create({
      data: {
        deviceFingerprint: fingerprint,
        designation,
        role: 'guest',
      },
    });
  }, { isolationLevel: 'Serializable' });

  return {
    participantId: newParticipant.id,
    designation: newParticipant.designation as Designation,
  };
}

/**
 * Get participant by fingerprint
 * @param fingerprint - Device fingerprint
 * @returns Participant or null
 */
export async function getParticipantByFingerprint(fingerprint: string) {
  return db.participant.findUnique({
    where: { deviceFingerprint: fingerprint },
  });
}

/**
 * Reset all participants (admin function)
 * Useful for resetting A/B assignments
 */
export async function resetParticipants(): Promise<void> {
  await db.participant.deleteMany({
    where: { role: 'guest' },
  });
}
