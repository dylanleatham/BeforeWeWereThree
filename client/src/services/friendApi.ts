import type {
  ApiResponse,
  FriendDashboardResponse,
  FriendListResponse,
  FriendLettersResponse,
  FriendLetter,
  FriendThankYouNote,
  Friend,
  FriendLetterRecipient,
  FriendLetterViewResponse,
} from 'shared';

const API_BASE = '/api';

/**
 * Base fetch wrapper for friend API
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'error' in errorData) {
          if (errorData.error?.code === 'SESSION_EXPIRED') {
            window.dispatchEvent(new CustomEvent('session-expired'));
          }
          return errorData as ApiResponse<T>;
        }
      } catch {
        // Not JSON
      }
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: response.statusText || `Request failed with status ${response.status}`,
        },
      };
    }

    return await response.json() as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Unable to connect to server' },
    };
  }
}

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
  const response = await apiFetch<{ letter: FriendLetter }>('/friends/me/letters', {
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
  data: { content?: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendLetter> {
  const response = await apiFetch<{ letter: FriendLetter }>(`/friends/me/letters/${letterId}`, {
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
  data: { content?: string; mediaUrl?: string | null; mediaType?: string | null }
): Promise<FriendLetter> {
  const response = await apiFetch<{ letter: FriendLetter }>(`/friends/me/letters/${letterId}/submit`, {
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
  const response = await apiFetch<{ friend: Friend }>('/friends', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create friend');
  }
  return response.data.friend;
}

export async function deleteFriend(friendId: string): Promise<void> {
  const response = await apiFetch<{ deleted: boolean }>(`/friends/${friendId}`, {
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
  const response = await apiFetch<{ note: FriendThankYouNote }>(`/friends/${friendId}/thank-you`, {
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
// Couple Route (view friend letter)
// ============================================================

export async function getFriendLetterView(friendLetterId: string): Promise<FriendLetterViewResponse> {
  const response = await apiFetch<FriendLetterViewResponse>(`/friends/letter/${friendLetterId}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch friend letter');
  }
  return response.data;
}
