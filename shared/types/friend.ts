import { z } from 'zod';

/**
 * Friend types for Before We Were Three
 * Friends are people who write letters to the couple and baby
 */

/**
 * Valid friend letter recipients
 */
export type FriendLetterRecipient = 'you' | 'partner' | 'baby';

/**
 * Friend entity (API response)
 */
export interface Friend {
  id: string;
  name: string;
  pin: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Thank-you note from couple to friend
 */
export interface FriendThankYouNote {
  id: string;
  friendId: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Letter from friend to a recipient
 */
export interface FriendLetter {
  id: string;
  friendId: string;
  recipient: FriendLetterRecipient;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Friend letter status for dashboard display
 */
export type FriendLetterStatus = 'draft' | 'submitted';

/**
 * Dashboard letter card info
 */
export interface FriendLetterCard {
  id: string;
  recipient: FriendLetterRecipient;
  recipientName: string;
  status: FriendLetterStatus;
  content: string;
  submittedAt: string | null;
}

/**
 * Friend dashboard response (for friend view)
 */
export interface FriendDashboardResponse {
  friend: { id: string; name: string };
  thankYouNote: FriendThankYouNote | null;
  letters: FriendLetterCard[];
}

/**
 * Admin: list all friends response
 */
export interface FriendListResponse {
  friends: (Friend & { letterCount: number; submittedCount: number })[];
}

/**
 * Admin: friend's submitted letters
 */
export interface FriendLettersResponse {
  friend: Friend;
  letters: FriendLetter[];
}

// ============================================================
// Zod Schemas for validation
// ============================================================

/**
 * Create friend (admin)
 */
export const createFriendSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  pin: z
    .string()
    .length(8, 'PIN must be exactly 8 digits')
    .regex(/^\d{8}$/, 'PIN must contain only digits'),
});

export type CreateFriendRequest = z.infer<typeof createFriendSchema>;

/**
 * Save friend letter (auto-save)
 */
export const saveFriendLetterSchema = z.object({
  content: z.string().max(10000, 'Letter is too long').optional(),
  mediaUrl: z.string().url('Invalid media URL').nullable().optional(),
  mediaType: z.enum(['image', 'video', 'audio']).nullable().optional(),
});

export type SaveFriendLetterRequest = z.infer<typeof saveFriendLetterSchema>;

/**
 * Submit friend letter (final)
 */
export const submitFriendLetterSchema = z.object({
  content: z.string().max(10000, 'Letter is too long').optional(),
  mediaUrl: z.string().url('Invalid media URL').nullable().optional(),
  mediaType: z.enum(['image', 'video', 'audio']).nullable().optional(),
});

export type SubmitFriendLetterRequest = z.infer<typeof submitFriendLetterSchema>;

/**
 * Save thank-you note (admin)
 */
export const saveFriendThankYouNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Note is too long'),
  mediaUrl: z.string().url('Invalid media URL').nullable().optional(),
  mediaType: z.enum(['image', 'video', 'audio']).nullable().optional(),
});

export type SaveFriendThankYouNoteRequest = z.infer<typeof saveFriendThankYouNoteSchema>;

/**
 * Friend letter recipient validation
 */
export const friendLetterRecipientSchema = z.enum(['you', 'partner', 'baby']);

/**
 * Create a new friend letter
 */
export const createFriendLetterSchema = z.object({
  recipient: friendLetterRecipientSchema,
});

export type CreateFriendLetterRequest = z.infer<typeof createFriendLetterSchema>;

/**
 * Friend letter view for couple (read-only)
 */
export interface FriendLetterViewResponse {
  friendName: string;
  recipient: FriendLetterRecipient;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  submittedAt: string;
}
