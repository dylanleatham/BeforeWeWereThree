import { db } from '../db/connection.js';
import {
  getFriendById,

  createFriend as dbCreateFriend,
  deleteFriend as dbDeleteFriend,
  getFriendLetters,
  getFriendLetterById,
  createFriendLetter as dbCreateFriendLetter,
  updateFriendLetter as dbUpdateFriendLetter,
  getThankYouNote,
  upsertThankYouNote as dbUpsertThankYouNote,
} from '../db/queries/friend.js';
import { findGenderRevealConfig } from '../db/queries/genderReveal.js';
import { getGuestPin, getAdminPin } from '../db/queries/config.js';
import type {
  FriendDashboardResponse,
  FriendListResponse,
  FriendLetter,
  FriendLetterCard,
  FriendLetterRecipient,
  FriendLetterViewResponse,
  FriendThankYouNote,
  FriendWithPin,
  GenderKeeperStatus,
} from 'shared';

/**
 * Friend service for Before We Were Three
 * Business logic for friend letter writing feature
 */

const RECIPIENT_NAMES: Record<FriendLetterRecipient, string> = {
  you: process.env.RECIPIENT_NAME_YOU ?? 'Dylan',
  partner: process.env.RECIPIENT_NAME_PARTNER ?? 'Wife',
  baby: process.env.RECIPIENT_NAME_BABY ?? 'Baby',
};

// ============================================================
// Admin Operations
// ============================================================

/**
 * Get all friends with letter counts (admin)
 */
export async function getAllFriends(): Promise<FriendListResponse> {
  const friends = await db.friend.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { friendLetters: true } },
      friendLetters: {
        where: { submittedAt: { not: null } },
        select: { id: true },
      },
    },
  });

  const friendsWithCounts = friends.map((friend) => ({
    id: friend.id,
    name: friend.name,
    isGenderKeeper: friend.isGenderKeeper,
    createdAt: friend.createdAt.toISOString(),
    updatedAt: friend.updatedAt.toISOString(),
    letterCount: friend._count.friendLetters,
    submittedCount: friend.friendLetters.length,
  }));

  return { friends: friendsWithCounts };
}

/**
 * Create a new friend with PIN uniqueness validation
 */
export async function createFriend(name: string, pin: string): Promise<FriendWithPin> {
  // Check PIN doesn't collide with admin/guest PINs
  const [guestPin, adminPin] = await Promise.all([getGuestPin(), getAdminPin()]);

  if ((guestPin && pin === guestPin) || (adminPin && pin === adminPin)) {
    throw new Error('PIN_ALREADY_EXISTS');
  }

  // Rely on DB unique constraint to prevent duplicate friend PINs (no TOCTOU race)
  try {
    return await dbCreateFriend(name, pin);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      throw new Error('PIN_ALREADY_EXISTS');
    }
    throw error;
  }
}

/**
 * Delete a friend and all their content (irreversible)
 */
export async function removeFriend(friendId: string): Promise<boolean> {
  const friend = await getFriendById(friendId);
  if (!friend) {
    throw new Error('FRIEND_NOT_FOUND');
  }

  return dbDeleteFriend(friendId);
}

/**
 * Save thank-you note for a friend (admin)
 */
export async function saveThankYouNote(
  friendId: string,
  data: { content: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendThankYouNote> {
  const friend = await getFriendById(friendId);
  if (!friend) {
    throw new Error('FRIEND_NOT_FOUND');
  }

  return dbUpsertThankYouNote(friendId, data);
}

/**
 * Get a friend's submitted letters (admin view)
 */
export async function getFriendLettersForAdmin(friendId: string) {
  const friend = await getFriendById(friendId);
  if (!friend) {
    throw new Error('FRIEND_NOT_FOUND');
  }

  const letters = await getFriendLetters(friendId);
  return { friend, letters };
}

// ============================================================
// Friend Operations
// ============================================================

/**
 * Get friend dashboard data
 */
export async function getFriendDashboard(friendId: string): Promise<FriendDashboardResponse> {
  const friend = await getFriendById(friendId);
  if (!friend) {
    throw new Error('FRIEND_NOT_FOUND');
  }

  const [thankYouNote, existingLetters] = await Promise.all([
    getThankYouNote(friendId),
    getFriendLetters(friendId),
  ]);

  // Build letter cards — one per existing letter
  const letters: FriendLetterCard[] = existingLetters.map((letter) => ({
    id: letter.id,
    recipient: letter.recipient,
    recipientName: RECIPIENT_NAMES[letter.recipient] || letter.recipient,
    title: letter.title,
    status: letter.submittedAt ? 'submitted' : 'draft',
    content: letter.content,
    submittedAt: letter.submittedAt,
  }));

  // Check gender keeper status
  let genderKeeperStatus: GenderKeeperStatus | null = null;
  if (friend.isGenderKeeper) {
    const config = await findGenderRevealConfig();
    genderKeeperStatus = {
      isGenderKeeper: true,
      revealConfigured: config !== null,
      genderAlreadySet: config !== null && config.genderValue !== null,
    };
  }

  return {
    friend: { id: friend.id, name: friend.name },
    thankYouNote,
    letters,
    genderKeeperStatus,
  };
}

/**
 * Create a new friend letter draft
 */
export async function createNewFriendLetter(
  friendId: string,
  recipient: FriendLetterRecipient
): Promise<FriendLetter> {
  const friend = await getFriendById(friendId);
  if (!friend) {
    throw new Error('FRIEND_NOT_FOUND');
  }

  return dbCreateFriendLetter(friendId, recipient);
}

/**
 * Save friend letter draft by ID (auto-save)
 */
export async function saveFriendLetter(
  friendId: string,
  letterId: string,
  data: { title?: string | null; content?: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendLetter> {
  const existing = await getFriendLetterById(letterId);
  if (!existing || existing.friendId !== friendId) {
    throw new Error('LETTER_NOT_FOUND');
  }
  if (existing.submittedAt) {
    throw new Error('ALREADY_SUBMITTED');
  }

  return dbUpdateFriendLetter(letterId, data);
}

/**
 * Submit friend letter (final, creates envelope for couple)
 */
export async function submitFriendLetterAndCreateEnvelope(
  friendId: string,
  letterId: string,
  data: { title?: string | null; content?: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendLetter> {
  const friend = await getFriendById(friendId);
  if (!friend) {
    throw new Error('FRIEND_NOT_FOUND');
  }

  const existing = await getFriendLetterById(letterId);
  if (!existing || existing.friendId !== friendId) {
    throw new Error('LETTER_NOT_FOUND');
  }
  if (existing.submittedAt) {
    throw new Error('ALREADY_SUBMITTED');
  }

  // Save final content then submit, all in a transaction
  const result = await db.$transaction(async (tx) => {
    // Update the letter content and mark submitted
    const letter = await tx.friendLetter.update({
      where: { id: letterId },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        content: data.content ?? existing.content,
        mediaUrl: data.mediaUrl ?? existing.mediaUrl,
        mediaType: data.mediaType ?? existing.mediaType,
        submittedAt: new Date(),
      },
    });

    // Get max envelope order
    const maxOrder = await tx.envelope.aggregate({
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    // Map recipient to display name
    const recipientName = RECIPIENT_NAMES[letter.recipient as FriendLetterRecipient] || letter.recipient;

    // Build envelope title: include letter title if present for differentiation
    const baseTitle = `Letter from ${friend.name} to ${recipientName}`;
    const envelopeTitle = letter.title ? `${baseTitle} \u2014 ${letter.title}` : baseTitle;

    // Create envelope for the couple
    await tx.envelope.create({
      data: {
        type: 'friend-letter',
        title: envelopeTitle,
        status: 'sealed',
        order: nextOrder,
        friendLetterId: letter.id,
      },
    });

    return letter;
  });

  return {
    id: result.id,
    friendId: result.friendId,
    recipient: result.recipient as FriendLetterRecipient,
    title: result.title,
    content: result.content,
    mediaUrl: result.mediaUrl,
    mediaType: result.mediaType,
    submittedAt: result.submittedAt?.toISOString() ?? null,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}

/**
 * Get friend letter content for couple viewing (read-only)
 */
export async function getFriendLetterForCouple(friendLetterId: string): Promise<FriendLetterViewResponse | null> {
  const letter = await getFriendLetterById(friendLetterId);
  if (!letter || !letter.submittedAt) {
    return null;
  }

  const friend = await getFriendById(letter.friendId);
  if (!friend) {
    return null;
  }

  return {
    friendName: friend.name,
    recipient: letter.recipient,
    title: letter.title,
    content: letter.content,
    mediaUrl: letter.mediaUrl,
    mediaType: letter.mediaType,
    submittedAt: letter.submittedAt,
  };
}
