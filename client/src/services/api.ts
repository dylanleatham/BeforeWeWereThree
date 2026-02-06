import type {
  ApiResponse,
  ValidatePinResponse,
  SessionResponse,
  Envelope,
  EnvelopeListResponse,
  EnvelopeResponse,
  CreateEnvelopeRequest,
  UpdateEnvelopeRequest,
  SignalRNegotiateResponse,
  WYRPromptResponse,
  WYRVoteResponse,
  WYRPrompt,
} from 'shared';
import { STRINGS } from '../constants/strings';

/**
 * API client for Before We Were Three
 * Base fetch wrapper with credentials for cookie handling
 */

const API_BASE = '/api';

/**
 * Base fetch wrapper
 * Includes credentials for cookie handling
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
 */
export async function resetParticipants(): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>('/auth/participants', {
    method: 'DELETE',
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

// ============================================================================
// SignalR API
// ============================================================================

/**
 * Negotiate SignalR connection
 * Returns URL and access token for connecting to Azure SignalR Service
 */
export async function negotiateSignalR(): Promise<SignalRNegotiateResponse> {
  const response = await apiFetch<SignalRNegotiateResponse>('/signalr/negotiate', {
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
