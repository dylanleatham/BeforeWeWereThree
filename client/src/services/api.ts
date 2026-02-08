import type {
  ApiResponse,
  ValidatePinResponse,
  SessionResponse,
  Envelope,
  EnvelopeListResponse,
  EnvelopeResponse,
  CreateEnvelopeRequest,
  UpdateEnvelopeRequest,
  RealtimeNegotiateResponse,
  WYRPromptResponse,
  WYRVoteResponse,
  WYRPrompt,
  ResetSessionResponse,
  UploadSasResponse,
  Photo,
  PhotoListResponse,
  LetterPromptResponse,
  Letter,
  LetterPrompt,
  SubmitLetterResponse,
} from 'shared';
import { STRINGS } from '../constants/strings';

/**
 * API client for Before We Were Three
 * Base fetch wrapper with credentials for cookie handling
 */

const API_BASE = '/api';

/**
 * Base fetch wrapper
 * Includes credentials for cookie handling and proper HTTP status checking
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check if response is OK before parsing JSON
    if (!response.ok) {
      // Try to parse error response as JSON
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'error' in errorData) {
          return errorData as ApiResponse<T>;
        }
      } catch {
        // Response is not JSON (e.g., HTML error page)
      }

      // Return generic error based on status code
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: response.statusText || `Request failed with status ${response.status}`,
        },
      };
    }

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: STRINGS.API_ERROR_NETWORK,
      },
    };
  }
}

/**
 * Validate PIN and create session
 * @param pin - 8 digit PIN in MMDDYYYY format
 * @param deviceFingerprint - Device fingerprint
 * @returns API response with role and participant info
 */
export async function validatePin(
  pin: string,
  deviceFingerprint: string
): Promise<ApiResponse<ValidatePinResponse>> {
  return apiFetch<ValidatePinResponse>('/auth/validate-pin', {
    method: 'POST',
    body: JSON.stringify({ pin, deviceFingerprint }),
  });
}

/**
 * Get current session info
 * @returns API response with session info or 401 if not authenticated
 */
export async function getSession(): Promise<ApiResponse<SessionResponse>> {
  return apiFetch<SessionResponse>('/auth/session');
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

/**
 * Reset all guest participants (admin only)
 * Useful for testing A/B designation reassignment
 * @deprecated Use resetSession() instead for comprehensive reset
 */
export async function resetParticipants(): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>('/auth/participants', {
    method: 'DELETE',
  });
}

/**
 * Reset entire session state (admin only)
 *
 * Comprehensive reset that:
 * - Kicks out all guest participants (clears A/B designations)
 * - Resets all envelopes to 'sealed' status
 * - Deletes all WYR votes
 * - (Future features should add their reset logic here)
 */
export async function resetSession(): Promise<ApiResponse<ResetSessionResponse>> {
  return apiFetch<ResetSessionResponse>('/admin/reset-session', {
    method: 'POST',
  });
}

// ============================================================================
// Envelope API
// ============================================================================

/**
 * Fetch all envelopes
 */
export async function getEnvelopes(): Promise<Envelope[]> {
  const response = await apiFetch<EnvelopeListResponse>('/envelopes');

  if (!response.success) {
    throw new Error(response.error?.message || STRINGS.API_ERROR_FETCH_ENVELOPES);
  }

  return response.data.envelopes;
}

/**
 * Fetch single envelope by ID
 */
export async function getEnvelope(id: string): Promise<Envelope> {
  const response = await apiFetch<EnvelopeResponse>(`/envelopes/${id}`);

  if (!response.success) {
    throw new Error(response.error?.message || STRINGS.API_ERROR_FETCH_ENVELOPE);
  }

  return response.data.envelope;
}

/**
 * Create new envelope (admin only)
 */
export async function createEnvelope(
  envelope: CreateEnvelopeRequest
): Promise<Envelope> {
  const response = await apiFetch<EnvelopeResponse>('/envelopes', {
    method: 'POST',
    body: JSON.stringify(envelope),
  });

  if (!response.success) {
    throw new Error(response.error?.message || STRINGS.API_ERROR_CREATE_ENVELOPE);
  }

  return response.data.envelope;
}

/**
 * Update envelope (admin only)
 */
export async function updateEnvelope(
  id: string,
  updates: UpdateEnvelopeRequest
): Promise<Envelope> {
  const response = await apiFetch<EnvelopeResponse>(`/envelopes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  if (!response.success) {
    throw new Error(response.error?.message || STRINGS.API_ERROR_UPDATE_ENVELOPE);
  }

  return response.data.envelope;
}

/**
 * Delete envelope (admin only)
 */
export async function deleteEnvelope(id: string): Promise<void> {
  const response = await apiFetch<Record<string, never>>(`/envelopes/${id}`, {
    method: 'DELETE',
  });

  if (!response.success) {
    throw new Error(response.error?.message || STRINGS.API_ERROR_DELETE_ENVELOPE);
  }
}

/**
 * Open a sealed envelope (any authenticated user)
 * Transitions envelope from 'sealed' to 'opened'
 */
export async function openEnvelope(id: string): Promise<Envelope> {
  const response = await apiFetch<EnvelopeResponse>(`/envelopes/${id}/open`, {
    method: 'POST',
  });

  if (!response.success) {
    throw new Error(response.error?.message || STRINGS.API_ERROR_UPDATE_ENVELOPE);
  }

  return response.data.envelope;
}

// ============================================================================
// Realtime API
// ============================================================================

/**
 * Negotiate real-time connection
 * Returns transport type and connection details for Socket.io or Azure SignalR
 */
export async function negotiateRealtime(): Promise<RealtimeNegotiateResponse> {
  const response = await apiFetch<RealtimeNegotiateResponse>('/signalr/negotiate', {
    method: 'POST',
  });

  if (!response.success) {
    throw new Error(response.error?.message || STRINGS.API_ERROR_SIGNALR_NEGOTIATE);
  }

  return response.data;
}

// ============================================================================
// Would You Rather API
// ============================================================================

/**
 * Get WYR prompt state for an envelope
 */
export async function getWyrPrompt(envelopeId: string): Promise<WYRPromptResponse> {
  const response = await apiFetch<WYRPromptResponse>(`/wyr/${envelopeId}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch WYR prompt');
  }
  return response.data;
}

/**
 * Submit vote for a WYR prompt
 */
export async function submitWyrVote(
  promptId: string,
  choice: 'option_a' | 'option_b'
): Promise<WYRVoteResponse> {
  const response = await apiFetch<WYRVoteResponse>(`/wyr/${promptId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ choice }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to submit vote');
  }
  return response.data;
}

/**
 * Create WYR prompt (admin only)
 */
export async function createWyrPrompt(data: {
  envelopeId: string;
  optionA: string;
  optionB: string;
}): Promise<WYRPrompt> {
  const response = await apiFetch<{ prompt: WYRPrompt }>('/wyr', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create WYR prompt');
  }
  return response.data.prompt;
}

/**
 * Update WYR prompt (admin only)
 */
export async function updateWyrPrompt(
  id: string,
  data: { optionA?: string; optionB?: string }
): Promise<WYRPrompt> {
  const response = await apiFetch<{ prompt: WYRPrompt }>(`/wyr/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to update WYR prompt');
  }
  return response.data.prompt;
}

/**
 * Delete WYR prompt (admin only)
 */
export async function deleteWyrPrompt(id: string): Promise<void> {
  const response = await apiFetch<Record<string, never>>(`/wyr/${id}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete WYR prompt');
  }
}

// ============================================================================
// Media API
// ============================================================================

/**
 * Get SAS token for uploading a photo to Azure Blob Storage
 * @param filename - Original filename
 * @param contentType - MIME type (must start with 'image/')
 */
export async function getUploadSas(
  filename: string,
  contentType: string
): Promise<UploadSasResponse> {
  const response = await apiFetch<UploadSasResponse>('/media/sas', {
    method: 'POST',
    body: JSON.stringify({ filename, contentType }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to get upload URL');
  }
  return response.data;
}

/**
 * Register a photo in the database after uploading to blob storage
 * @param blobUrl - The blob URL (without SAS token)
 * @param filename - Original filename
 * @param contentType - MIME type
 */
export async function registerPhoto(
  blobUrl: string,
  filename: string,
  contentType: string
): Promise<Photo> {
  const response = await apiFetch<{ photo: Photo }>('/media/register', {
    method: 'POST',
    body: JSON.stringify({ blobUrl, filename, contentType }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to register photo');
  }
  return response.data.photo;
}

/**
 * Get all photos
 */
export async function getPhotos(): Promise<Photo[]> {
  const response = await apiFetch<PhotoListResponse>('/media');
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch photos');
  }
  return response.data.photos;
}

/**
 * Get a single photo by ID
 */
export async function getPhoto(id: string): Promise<Photo> {
  const response = await apiFetch<{ photo: Photo }>(`/media/${id}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch photo');
  }
  return response.data.photo;
}

/**
 * Delete a photo (admin only)
 */
export async function deletePhoto(id: string): Promise<void> {
  const response = await apiFetch<Record<string, never>>(`/media/${id}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete photo');
  }
}

// ============================================================================
// Letter API
// ============================================================================

/**
 * Get letter state for an envelope
 */
export async function getLetterState(envelopeId: string): Promise<LetterPromptResponse> {
  const response = await apiFetch<LetterPromptResponse>(`/letters/${envelopeId}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch letter state');
  }
  return response.data;
}

/**
 * Save letter content (auto-save, does not submit)
 */
export async function saveLetter(
  envelopeId: string,
  content: string,
  photoUrl: string | null
): Promise<Letter> {
  const response = await apiFetch<{ letter: Letter }>(`/letters/${envelopeId}/save`, {
    method: 'PUT',
    body: JSON.stringify({ content, photoUrl }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to save letter');
  }
  return response.data.letter;
}

/**
 * Submit letter (locks content and marks as submitted)
 */
export async function submitLetter(envelopeId: string): Promise<SubmitLetterResponse> {
  const response = await apiFetch<SubmitLetterResponse>(`/letters/${envelopeId}/submit`, {
    method: 'POST',
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to submit letter');
  }
  return response.data;
}

/**
 * Create letter prompt (admin only)
 */
export async function createLetterPrompt(data: {
  envelopeId: string;
  prompt: string;
}): Promise<LetterPrompt> {
  const response = await apiFetch<{ prompt: LetterPrompt }>('/letters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create letter prompt');
  }
  return response.data.prompt;
}

/**
 * Update letter prompt (admin only)
 */
export async function updateLetterPrompt(
  id: string,
  data: { prompt?: string }
): Promise<LetterPrompt> {
  const response = await apiFetch<{ prompt: LetterPrompt }>(`/letters/prompt/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to update letter prompt');
  }
  return response.data.prompt;
}

/**
 * Delete letter prompt (admin only)
 */
export async function deleteLetterPrompt(id: string): Promise<void> {
  const response = await apiFetch<Record<string, never>>(`/letters/prompt/${id}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete letter prompt');
  }
}

// ============================================================================
// Config API
// ============================================================================

/**
 * App config response type
 */
export interface AppConfig {
  spotifyUrl: string | null;
}

/**
 * Get public app config
 */
export async function getConfig(): Promise<AppConfig> {
  const response = await apiFetch<AppConfig>('/config');
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch config');
  }
  return response.data;
}

/**
 * Update app config (admin only)
 */
export async function updateConfig(config: { spotifyUrl?: string | null }): Promise<AppConfig> {
  const response = await apiFetch<AppConfig>('/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to update config');
  }
  return response.data;
}
