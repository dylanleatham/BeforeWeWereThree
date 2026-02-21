/**
 * Standard API response types
 * Per CLAUDE.md: All responses use consistent shape
 */

/**
 * Standard error codes used across the API
 * Provides type safety for error handling
 */
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'ENVELOPE_NOT_FOUND'
  | 'PROMPT_NOT_FOUND'
  | 'PROMPT_EXISTS'
  | 'ALREADY_VOTED'
  | 'INVALID_PIN'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR'
  | 'SIGNALR_NOT_CONFIGURED'
  | 'SIGNALR_CONFIG_ERROR'
  | 'SIGNALR_TOKEN_ERROR'
  | 'ALREADY_SUBMITTED'
  | 'PHOTO_NOT_FOUND'
  | 'PHOTO_EXISTS'
  | 'SERVICE_UNAVAILABLE'
  | 'TOO_MANY_REQUESTS'
  | 'SORT_ORDER_CONFLICT'
  | 'FRIEND_NOT_FOUND'
  | 'LETTER_NOT_FOUND'
  | 'NAME_NOT_FOUND'
  | 'PIN_ALREADY_EXISTS'
  | 'REVEAL_NOT_CONFIGURED'
  | 'REVEAL_ALREADY_DONE'
  | `HTTP_${number}`; // For HTTP status code errors

/**
 * Standard API error shape
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Helper to create success response
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

/**
 * Helper to create error response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return { success: false, error: { code, message, details } };
}

/**
 * Standard DELETE endpoint response
 */
export interface DeleteResponse {
  deleted: true;
}

/**
 * Reset session response - includes counts of what was reset
 */
export interface ResetSessionResponse {
  message: string;
  participantsDeleted: number;
  envelopesReset: number;
  votesDeleted: number;
  lettersDeleted: number;
  photosDeleted: number;
  nameVotesDeleted: number;
  nameNamesDeleted: number;
  nameRoundsDeleted: number;
  nameGuidanceDeleted: number;
  triviaAnswersDeleted: number;
  genderRevealReset: number;
}
