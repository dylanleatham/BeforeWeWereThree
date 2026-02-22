import type {
  FriendDashboardResponse,
  FriendListResponse,
  FriendLettersResponse,
  FriendLetter,
  FriendLetterResponse,
  Friend,
  FriendResponse,
  FriendThankYouNote,
  FriendThankYouNoteResponse,
  DeleteResponse,
  SetResponse,
  FriendLetterRecipient,
  FriendLetterViewResponse,
  SetGenderValueRequest,
} from 'shared';
import { apiFetch } from './fetchClient';

// ============================================================
// Friend Routes (for friend role)
// ============================================================

export async function getFriendDashboard(): Promise<FriendDashboardResponse> {
  const response = await apiFetch<FriendDashboardResponse>('/friends/me/dashboard');
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch dashboard');
  }
  return response.data;
}

export async function createFriendLetter(
  recipient: FriendLetterRecipient
): Promise<FriendLetter> {
  const response = await apiFetch<FriendLetterResponse>('/friends/me/letters', {
    method: 'POST',
    body: JSON.stringify({ recipient }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create letter');
  }
  return response.data.letter;
}

export async function saveFriendLetter(
  letterId: string,
  data: { title?: string | null; content?: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendLetter> {
  const response = await apiFetch<FriendLetterResponse>(`/friends/me/letters/${letterId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to save letter');
  }
  return response.data.letter;
}

export async function submitFriendLetter(
  letterId: string,
  data: { title?: string | null; content?: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendLetter> {
  const response = await apiFetch<FriendLetterResponse>(`/friends/me/letters/${letterId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to submit letter');
  }
  return response.data.letter;
}

// ============================================================
// Admin Routes (for admin role)
// ============================================================

export async function getAdminFriendList(): Promise<FriendListResponse> {
  const response = await apiFetch<FriendListResponse>('/friends');
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch friends');
  }
  return response.data;
}

export async function createFriend(data: { name: string; pin: string }): Promise<Friend> {
  const response = await apiFetch<FriendResponse>('/friends', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create friend');
  }
  return response.data.friend;
}

export async function deleteFriend(friendId: string): Promise<void> {
  const response = await apiFetch<DeleteResponse>(`/friends/${friendId}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete friend');
  }
}

export async function saveThankYouNote(
  friendId: string,
  data: { content: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendThankYouNote> {
  const response = await apiFetch<FriendThankYouNoteResponse>(`/friends/${friendId}/thank-you`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to save thank-you note');
  }
  return response.data.note;
}

export async function getAdminFriendLetters(friendId: string): Promise<FriendLettersResponse> {
  const response = await apiFetch<FriendLettersResponse>(`/friends/${friendId}/letters`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch friend letters');
  }
  return response.data;
}

// ============================================================
// Gender Keeper (friend sets gender)
// ============================================================

export async function setGender(data: SetGenderValueRequest): Promise<void> {
  const response = await apiFetch<SetResponse>('/gender-reveal/set-gender', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to set gender');
  }
}

// ============================================================
// Gender Keeper Admin (admin designates keeper)
// ============================================================

export async function setGenderKeeper(friendId: string | null): Promise<void> {
  const response = await apiFetch<SetResponse>('/friends/gender-keeper', {
    method: 'PUT',
    body: JSON.stringify({ friendId }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to set gender keeper');
  }
}

// ============================================================
// Couple Route (view friend letter)
// ============================================================

export async function getFriendLetterView(friendLetterId: string): Promise<FriendLetterViewResponse> {
  const response = await apiFetch<FriendLetterViewResponse>(`/friends/letter/${friendLetterId}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch friend letter');
  }
  return response.data;
}
