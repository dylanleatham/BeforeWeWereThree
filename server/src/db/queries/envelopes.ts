import { db } from '../connection.js';
import { Prisma } from '@prisma/client';
import type { Envelope as PrismaEnvelope } from '@prisma/client';
import type { Envelope, CreateEnvelopeRequest, UpdateEnvelopeRequest } from 'shared';

/**
 * Database queries for envelopes
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

/**
 * Transform Prisma Envelope to API Envelope
 * Converts Date objects to ISO strings for transport
 */
function toApiEnvelope(envelope: PrismaEnvelope): Envelope {
  return {
    ...envelope,
    type: envelope.type as Envelope['type'],
    status: envelope.status as Envelope['status'],
    friendLetterId: envelope.friendLetterId,
    createdAt: envelope.createdAt.toISOString(),
    updatedAt: envelope.updatedAt.toISOString(),
  };
}

/**
 * Get all envelopes ordered by order field
 */
export async function getAllEnvelopes(): Promise<Envelope[]> {
  const envelopes = await db.envelope.findMany({
    orderBy: { order: 'asc' },
  });
  return envelopes.map(toApiEnvelope);
}

/**
 * Get envelopes visible to participants (couples/guests)
 * Filters out gender-reveal envelopes where gender has not been set yet
 */
export async function getParticipantEnvelopes(): Promise<Envelope[]> {
  const envelopes = await db.envelope.findMany({
    orderBy: { order: 'asc' },
    include: {
      genderRevealConfig: {
        select: { genderValue: true },
      },
    },
  });

  return envelopes
    .filter((e) => {
      // Hide gender-reveal envelopes that have no gender set yet
      if (e.type === 'gender-reveal' && !e.genderRevealConfig?.genderValue) {
        return false;
      }
      return true;
    })
    .map((e) => {
      // Strip the include field before returning
      const { genderRevealConfig: _config, ...envelope } = e;
      return toApiEnvelope(envelope as PrismaEnvelope);
    });
}

/**
 * Get single envelope by ID
 */
export async function getEnvelopeById(id: string): Promise<Envelope | null> {
  const envelope = await db.envelope.findUnique({
    where: { id },
  });
  return envelope ? toApiEnvelope(envelope) : null;
}

/**
 * Create new envelope (admin only)
 */
export async function createEnvelope(data: CreateEnvelopeRequest): Promise<Envelope> {
  const envelope = await db.envelope.create({
    data: {
      title: data.title,
      type: data.type,
      order: data.order,
      status: 'sealed', // New envelopes always start sealed
    },
  });
  return toApiEnvelope(envelope);
}

/**
 * Update envelope (admin only)
 */
export async function updateEnvelope(
  id: string,
  data: UpdateEnvelopeRequest
): Promise<Envelope | null> {
  try {
    const envelope = await db.envelope.update({
      where: { id },
      data,
    });
    return toApiEnvelope(envelope);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

/**
 * Delete envelope (admin only)
 */
export async function deleteEnvelope(id: string): Promise<boolean> {
  try {
    await db.envelope.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}

/**
 * Update envelope status (for user interactions)
 */
export async function updateEnvelopeStatus(
  id: string,
  status: Envelope['status']
): Promise<Envelope | null> {
  return updateEnvelope(id, { status });
}
