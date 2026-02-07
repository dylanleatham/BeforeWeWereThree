/**
 * Shared types for Before We Were Three
 * API contracts and shared interfaces
 */

// Re-export API types
export type {
  ErrorCode,
  ApiError,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  ResetSessionResponse,
} from './api.js';
export { successResponse, errorResponse } from './api.js';

// Re-export auth types
export type {
  Role,
  Designation,
  ValidatePinRequest,
  ValidatePinResponse,
  SessionPayload,
  SessionResponse,
  Participant,
} from './auth.js';
export { pinSchema, validatePinRequestSchema } from './auth.js';

// Re-export envelope types
export type {
  EnvelopeStatus,
  EnvelopeType,
  Envelope,
  CreateEnvelopeRequest,
  UpdateEnvelopeRequest,
  EnvelopeListResponse,
  EnvelopeResponse,
} from './envelope.js';
export { createEnvelopeSchema, updateEnvelopeSchema } from './envelope.js';

// Re-export SignalR/Realtime types
export type {
  RealtimeTransport,
  RealtimeNegotiateResponse,
  SignalRNegotiateResponse,
  PartnerPresenceMessage,
  SignalRMessage,
} from './signalr.js';

// Re-export WYR types
export type {
  WYRChoice,
  WYRPhase,
  WYRPrompt,
  WYRResults,
  WYRState,
  WYRPromptResponse,
  WYRVoteRequest,
  WYRVoteResponse,
  WYRVoteSubmittedMessage,
  WYRRevealReadyMessage,
  CreateWYRPromptRequest,
  UpdateWYRPromptRequest,
} from './wyr.js';
export {
  wyrChoiceSchema,
  wyrVoteRequestSchema,
  createWyrPromptSchema,
  updateWyrPromptSchema,
} from './wyr.js';

/**
 * Health check response data
 */
export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
}
