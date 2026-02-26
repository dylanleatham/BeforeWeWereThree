import { db } from '../connection.js';
import { Prisma } from '@prisma/client';
import type {
  Friend as PrismaFriend,
  FriendThankYouNote as PrismaFriendThankYouNote,
  FriendLetter as PrismaFriendLetter,
} from '@prisma/client';
import type {
  Friend,
  FriendWithPin,
  FriendThankYouNote,
  FriendLetter,
} from 'shared';

/**
 * Database queries for Friend, FriendThankYouNote, FriendLetter
 * Typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

// ============================================================
// Transformers
// ============================================================

function toApiFriend(friend: PrismaFriend): Friend {
  return {
    id: friend.id,
    name: friend.name,
    isGenderKeeper: friend.isGenderKeeper,
    createdAt: friend.createdAt.toISOString(),
    updatedAt: friend.updatedAt.toISOString(),
  };
}

function toApiFriendWithPin(friend: PrismaFriend): FriendWithPin {
  return {
    ...toApiFriend(friend),
    pin: friend.pin,
  };
}

function toApiThankYouNote(note: PrismaFriendThankYouNote): FriendThankYouNote {
  return {
    id: note.id,
    friendId: note.friendId,
    content: note.content,
    mediaUrl: note.mediaUrl,
    mediaType: note.mediaType,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function toApiFriendLetter(letter: PrismaFriendLetter): FriendLetter {
  return {
    id: letter.id,
    friendId: letter.friendId,
    recipient: letter.recipient as FriendLetter['recipient'],
    title: letter.title,
    content: letter.content,
    mediaUrl: letter.mediaUrl,
    mediaType: letter.mediaType,
    submittedAt: letter.submittedAt?.toISOString() ?? null,
    createdAt: letter.createdAt.toISOString(),
    updatedAt: letter.updatedAt.toISOString(),
  };
}

// ============================================================
// Friend Queries
// ============================================================

export async function getAllFriends(): Promise<Friend[]> {
  const friends = await db.friend.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return friends.map(toApiFriend);
}

export async function getFriendById(id: string): Promise<Friend | null> {
  const friend = await db.friend.findUnique({ where: { id } });
  return friend ? toApiFriend(friend) : null;
}

export async function getFriendByPin(pin: string): Promise<Friend | null> {
  const friend = await db.friend.findUnique({ where: { pin } });
  return friend ? toApiFriend(friend) : null;
}

export async function createFriend(name: string, pin: string): Promise<FriendWithPin> {
  const friend = await db.friend.create({
    data: { name, pin },
  });
  return toApiFriendWithPin(friend);
}

/**
 * Get the friend designated as gender keeper (at most one)
 */
export async function getGenderKeeper(): Promise<Friend | null> {
  const friend = await db.friend.findFirst({
    where: { isGenderKeeper: true },
  });
  return friend ? toApiFriend(friend) : null;
}

/**
 * Set a friend as the gender keeper (or clear all keepers if null)
 * Transaction: clear all existing keepers, then set the new one
 */
export async function setGenderKeeper(friendId: string | null): Promise<void> {
  await db.$transaction(async (tx) => {
    // Clear all existing keepers
    await tx.friend.updateMany({
      where: { isGenderKeeper: true },
      data: { isGenderKeeper: false },
    });

    // Set new keeper if provided
    if (friendId) {
      await tx.friend.update({
        where: { id: friendId },
        data: { isGenderKeeper: true },
      });
    }
  });
}

export async function deleteFriend(id: string): Promise<boolean> {
  try {
    // Must cascade: delete envelopes linked to friend letters, then letters, notes, participants
    await db.$transaction(async (tx) => {
      // Get all friend letter IDs
      const letters = await tx.friendLetter.findMany({
        where: { friendId: id },
        select: { id: true },
      });
      const letterIds = letters.map((l) => l.id);

      // Delete envelopes that reference these friend letters
      if (letterIds.length > 0) {
        await tx.envelope.deleteMany({
          where: { friendLetterId: { in: letterIds } },
        });
      }

      // Delete friend letters
      await tx.friendLetter.deleteMany({ where: { friendId: id } });

      // Delete thank-you note
      await tx.friendThankYouNote.deleteMany({ where: { friendId: id } });

      // Delete participant records linked to this friend
      await tx.participant.deleteMany({ where: { friendId: id } });

      // Finally delete the friend
      await tx.friend.delete({ where: { id } });
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}

// ============================================================
// Friend Letter Queries
// ============================================================

export async function getFriendLetters(friendId: string): Promise<FriendLetter[]> {
  const letters = await db.friendLetter.findMany({
    where: { friendId },
    orderBy: { createdAt: 'asc' },
  });
  return letters.map(toApiFriendLetter);
}

export async function createFriendLetter(
  friendId: string,
  recipient: string
): Promise<FriendLetter> {
  const letter = await db.friendLetter.create({
    data: { friendId, recipient },
  });
  return toApiFriendLetter(letter);
}

export async function getFriendLetterById(id: string): Promise<FriendLetter | null> {
  const letter = await db.friendLetter.findUnique({ where: { id } });
  return letter ? toApiFriendLetter(letter) : null;
}

export async function updateFriendLetter(
  letterId: string,
  data: { title?: string | null; content?: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendLetter> {
  const letter = await db.friendLetter.update({
    where: { id: letterId },
    data: {
      title: data.title,
      content: data.content,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
    },
  });
  return toApiFriendLetter(letter);
}

export async function submitFriendLetter(
  letterId: string
): Promise<FriendLetter | null> {
  try {
    const letter = await db.friendLetter.update({
      where: { id: letterId },
      data: { submittedAt: new Date() },
    });
    return toApiFriendLetter(letter);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

export async function countFriendLetters(friendId: string): Promise<{ total: number; submitted: number }> {
  const [total, submitted] = await Promise.all([
    db.friendLetter.count({ where: { friendId } }),
    db.friendLetter.count({ where: { friendId, submittedAt: { not: null } } }),
  ]);
  return { total, submitted };
}

// ============================================================
// Thank-You Note Queries
// ============================================================

export async function getThankYouNote(friendId: string): Promise<FriendThankYouNote | null> {
  const note = await db.friendThankYouNote.findUnique({
    where: { friendId },
  });
  return note ? toApiThankYouNote(note) : null;
}

export async function upsertThankYouNote(
  friendId: string,
  data: { content: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendThankYouNote> {
  const note = await db.friendThankYouNote.upsert({
    where: { friendId },
    update: {
      content: data.content,
      mediaUrl: data.mediaUrl ?? null,
      mediaType: data.mediaType ?? null,
    },
    create: {
      friendId,
      content: data.content,
      mediaUrl: data.mediaUrl ?? null,
      mediaType: data.mediaType ?? null,
    },
  });
  return toApiThankYouNote(note);
}
