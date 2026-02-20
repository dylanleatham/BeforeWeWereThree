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
  WYREnvelopeResponse,
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
  AppConfig,
  NameGameStateResponse,
  SubmitGuidanceResponse,
  NameVoteChoice,
  NameGameMatchList,
  NameGameResults,
  TriviaEnvelopeResponse,
  TriviaAnswerResponse,
  TriviaQuestion,
  TriviaEnvelopeQuestion,
  CreateTriviaQuestionRequest,
  UpdateTriviaQuestionRequest,
  GenderRevealStateResponse,
  ValidateKeyResponse,
} from 'shared';
import { apiFetch } from './fetchClient';
import { STRINGS } from '../constants/strings';

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

/**
 * Join a real-time group (server-side group management)
 * Used for activity-specific messaging
 */
export async function joinRealtimeGroup(groupName: string): Promise<void> {
  await apiFetch('/signalr/groups/join', {
    method: 'POST',
    body: JSON.stringify({ groupName }),
  });
}

/**
 * Leave a real-time group
 */
export async function leaveRealtimeGroup(groupName: string): Promise<void> {
  await apiFetch('/signalr/groups/leave', {
    method: 'POST',
    body: JSON.stringify({ groupName }),
  });
}

// ============================================================================
// Would You Rather API
// ============================================================================

/**
 * Get WYR envelope state (all prompts with voting state)
 */
export async function getWyrState(envelopeId: string): Promise<WYREnvelopeResponse> {
  const response = await apiFetch<WYREnvelopeResponse>(`/wyr/${envelopeId}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch WYR state');
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
 * Get WYR prompts for an envelope (admin only)
 */
export async function getWyrPromptsForEnvelope(envelopeId: string): Promise<WYRPrompt[]> {
  const response = await apiFetch<{ prompts: WYRPrompt[] }>(`/wyr/envelope/${envelopeId}/prompts`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch WYR prompts');
  }
  return response.data.prompts;
}

/**
 * Create WYR prompt (admin only)
 */
export async function createWyrPrompt(data: {
  envelopeId: string;
  optionA: string;
  optionB: string;
  sortOrder?: number;
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
 * Bulk create WYR prompts for an envelope (admin only)
 */
export async function createWyrPromptsBulk(data: {
  envelopeId: string;
  prompts: Array<{ optionA: string; optionB: string }>;
}): Promise<WYRPrompt[]> {
  const response = await apiFetch<{ prompts: WYRPrompt[] }>('/wyr/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to bulk create WYR prompts');
  }
  return response.data.prompts;
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
  const response = await apiFetch<{ letter: Letter }>(`/letters/${envelopeId}`, {
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
export async function submitLetter(
  envelopeId: string,
  content: string,
  photoUrl: string | null
): Promise<SubmitLetterResponse> {
  const response = await apiFetch<SubmitLetterResponse>(`/letters/${envelopeId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ content, photoUrl }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to submit letter');
  }
  return response.data;
}

/**
 * Get letter prompt for an envelope (admin only)
 */
export async function getLetterPromptForEnvelope(envelopeId: string): Promise<LetterPrompt | null> {
  const response = await apiFetch<{ prompt: LetterPrompt }>(`/letters/prompt/envelope/${envelopeId}`);
  if (!response.success) {
    if (response.error?.code === 'PROMPT_NOT_FOUND') {
      return null;
    }
    throw new Error(response.error?.message || 'Failed to fetch letter prompt');
  }
  return response.data.prompt;
}

/**
 * Create letter prompt (admin only)
 */
export async function createLetterPrompt(data: {
  envelopeId: string;
  prompt: string;
}): Promise<LetterPrompt> {
  const response = await apiFetch<{ prompt: LetterPrompt }>('/letters/prompt', {
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

// ============================================================================
// Name Game API
// ============================================================================

/**
 * Get name game state for an envelope (current round + matches)
 */
export async function getNameGameState(envelopeId: string): Promise<NameGameStateResponse> {
  const response = await apiFetch<NameGameStateResponse>(`/name-game/${envelopeId}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch name game state');
  }
  return response.data;
}

/**
 * Submit guidance/readiness for the next round of name generation
 *
 * Returns either:
 * - waiting_for_partner: guidance recorded, waiting for partner
 * - round_generated: names are ready for voting
 */
export async function submitNameGameGuidance(
  envelopeId: string,
  guidance?: string
): Promise<SubmitGuidanceResponse> {
  const response = await apiFetch<SubmitGuidanceResponse>(`/name-game/${envelopeId}/guidance`, {
    method: 'POST',
    body: JSON.stringify({ guidance }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to submit guidance');
  }
  return response.data;
}

/**
 * Submit a vote on a generated name
 */
export async function submitNameVote(
  nameId: string,
  choice: NameVoteChoice
): Promise<{ allVoted: boolean; results?: NameGameResults }> {
  const response = await apiFetch<{ allVoted: boolean; results?: NameGameResults }>(
    `/name-game/${nameId}/vote`,
    {
      method: 'POST',
      body: JSON.stringify({ choice }),
    }
  );
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to submit vote');
  }
  return response.data;
}

/**
 * Get accumulated matches across all rounds
 */
export async function getNameGameMatches(envelopeId: string): Promise<NameGameMatchList> {
  const response = await apiFetch<NameGameMatchList>(`/name-game/${envelopeId}/matches`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch matches');
  }
  return response.data;
}

// ============================================================================
// Trivia API
// ============================================================================

/**
 * Get trivia envelope state (all questions with answer state)
 */
export async function getTriviaState(envelopeId: string): Promise<TriviaEnvelopeResponse> {
  const response = await apiFetch<TriviaEnvelopeResponse>(`/trivia/${envelopeId}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch trivia state');
  }
  return response.data;
}

/**
 * Submit an answer for a trivia question
 */
export async function submitTriviaAnswer(
  envelopeId: string,
  questionId: string,
  selectedIndex: number
): Promise<TriviaAnswerResponse> {
  const response = await apiFetch<TriviaAnswerResponse>(`/trivia/${envelopeId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId, selectedIndex }),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to submit trivia answer');
  }
  return response.data;
}

// ============================================================================
// Trivia Admin API
// ============================================================================

/**
 * Get all trivia questions from the content library (admin only)
 */
export async function getTriviaQuestions(): Promise<TriviaQuestion[]> {
  const response = await apiFetch<{ questions: TriviaQuestion[] }>('/trivia/admin/questions');
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch trivia questions');
  }
  return response.data.questions;
}

/**
 * Create a trivia question in the content library (admin only)
 */
export async function createTriviaQuestion(
  data: CreateTriviaQuestionRequest
): Promise<TriviaQuestion> {
  const response = await apiFetch<{ question: TriviaQuestion }>('/trivia/admin/questions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to create trivia question');
  }
  return response.data.question;
}

/**
 * Update a trivia question in the content library (admin only)
 */
export async function updateTriviaQuestion(
  id: string,
  data: UpdateTriviaQuestionRequest
): Promise<TriviaQuestion> {
  const response = await apiFetch<{ question: TriviaQuestion }>(`/trivia/admin/questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to update trivia question');
  }
  return response.data.question;
}

/**
 * Delete a trivia question from the content library (admin only)
 */
export async function deleteTriviaQuestion(id: string): Promise<void> {
  const response = await apiFetch<{ deleted: boolean }>(`/trivia/admin/questions/${id}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete trivia question');
  }
}

/**
 * Get trivia questions assigned to an envelope (admin only)
 */
export async function getEnvelopeTriviaQuestions(
  envelopeId: string
): Promise<TriviaEnvelopeQuestion[]> {
  const response = await apiFetch<{ questions: TriviaEnvelopeQuestion[] }>(
    `/trivia/admin/envelope/${envelopeId}/questions`
  );
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch envelope trivia questions');
  }
  return response.data.questions;
}

/**
 * Assign trivia questions to an envelope (admin only)
 * Array order determines sort order
 */
export async function assignTriviaQuestions(
  envelopeId: string,
  questionIds: string[]
): Promise<number> {
  const response = await apiFetch<{ count: number }>(
    `/trivia/admin/envelope/${envelopeId}/questions`,
    {
      method: 'PUT',
      body: JSON.stringify({ questionIds }),
    }
  );
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to assign trivia questions');
  }
  return response.data.count;
}

/**
 * Reorder trivia questions within an envelope (admin only)
 * Array order determines new sort order
 */
export async function reorderTriviaQuestions(
  envelopeId: string,
  questionIds: string[]
): Promise<number> {
  const response = await apiFetch<{ count: number }>(
    `/trivia/admin/envelope/${envelopeId}/questions/reorder`,
    {
      method: 'PUT',
      body: JSON.stringify({ questionIds }),
    }
  );
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to reorder trivia questions');
  }
  return response.data.count;
}

// ============================================================================
// Gender Reveal API
// ============================================================================

/**
 * Get gender reveal state for an envelope (participant-facing)
 * NEVER includes gender unless reveal is complete (REVEAL-05)
 */
export async function getGenderRevealState(
  envelopeId: string
): Promise<GenderRevealStateResponse> {
  const response = await apiFetch<GenderRevealStateResponse>(
    `/gender-reveal/${envelopeId}`
  );
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch gender reveal state');
  }
  return response.data;
}

/**
 * Submit a key for gender reveal validation
 * Returns the validation result (invalid, waiting, revealed, etc.)
 */
export async function validateRevealKey(
  envelopeId: string,
  key: string
): Promise<ValidateKeyResponse> {
  const response = await apiFetch<ValidateKeyResponse>(
    `/gender-reveal/${envelopeId}/validate-key`,
    {
      method: 'POST',
      body: JSON.stringify({ key }),
    }
  );
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to validate reveal key');
  }
  return response.data;
}
