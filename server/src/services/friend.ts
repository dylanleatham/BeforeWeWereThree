import { db } from '../db/connection.js';
import {
  getAllFriends as dbGetAllFriends,
  getFriendById,
  getFriendByPin,
  createFriend as dbCreateFriend,
  deleteFriend as dbDeleteFriend,
  getFriendLetters,
  getFriendLetterById,
  createFriendLetter as dbCreateFriendLetter,
  updateFriendLetter as dbUpdateFriendLetter,
  countFriendLetters,
  getThankYouNote,
  upsertThankYouNote as dbUpsertThankYouNote,
} from '../db/queries/friend.js';
import { getGuestPin, getAdminPin } from '../db/queries/config.js';
import type {
  FriendDashboardResponse,
  FriendListResponse,
  FriendLetter,
  FriendLetterCard,
  FriendLetterRecipient,
  FriendLetterViewResponse,
  FriendThankYouNote,
  Friend,
} from 'shared';

/**
 * Friend service for Before We Were Three
 * Business logic for friend letter writing feature
 */

const RECIPIENT_NAMES: Record<FriendLetterRecipient, string> = {
  you: 'Dylan',
  partner: 'Wife',
  baby: 'Baby',
};

// ============================================================
// Admin Operations
// ============================================================

/**
 * Get all friends with letter counts (admin)
 */
export async function getAllFriends(): Promise<FriendListResponse> {
  const friends = await dbGetAllFriends();
  const friendsWithCounts = await Promise.all(
    friends.map(async (friend) => {
      const counts = await countFriendLetters(friend.id);
      return {
        ...friend,
        letterCount: counts.total,
        submittedCount: counts.submitted,
      };
    })
  );
  return { friends: friendsWithCounts };
}

/**
 * Create a new friend with PIN uniqueness validation
 */
export async function createFriend(name: string, pin: string): Promise<Friend> {
  // Check PIN doesn't collide with admin/guest PINs
  const [guestPin, adminPin] = await Promise.all([getGuestPin(), getAdminPin()]);

  if ((guestPin && pin === guestPin) || (adminPin && pin === adminPin)) {
    throw new Error('PIN_ALREADY_EXISTS');
  }

  // Check PIN doesn't collide with existing friend PINs
  const existingFriend = await getFriendByPin(pin);
  if (existingFriend) {
    throw new Error('PIN_ALREADY_EXISTS');
  }

  return dbCreateFriend(name, pin);
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
    status: letter.submittedAt ? 'submitted' : 'draft',
    content: letter.content,
    submittedAt: letter.submittedAt,
  }));

  return {
    friend: { id: friend.id, name: friend.name },
    thankYouNote,
    letters,
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
  data: { content?: string; mediaUrl?: string | null; mediaType?: string | null }
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
  data: { content?: string; mediaUrl?: string | null; mediaType?: string | null }
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

    // Create envelope for the couple
    await tx.envelope.create({
      data: {
        type: 'friend-letter',
        title: `Letter from ${friend.name} to ${recipientName}`,
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
    content: letter.content,
    mediaUrl: letter.mediaUrl,
    mediaType: letter.mediaType,
    submittedAt: letter.submittedAt,
  };
}
