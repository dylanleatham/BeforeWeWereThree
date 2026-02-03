/**
 * Shared types for Before We Were Three
 * API contracts and shared interfaces
 */

// Re-export API types
export type {
  ApiError,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
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

/**
 * Health check response data
 */
export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
}
