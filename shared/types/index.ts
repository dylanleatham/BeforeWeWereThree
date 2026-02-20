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
  WYRPromptState,
  WYREnvelopeResponse,
  WYRVoteRequest,
  WYRVoteResponse,
  WYRVoteSubmittedMessage,
  WYRRevealReadyMessage,
  CreateWYRPromptRequest,
  CreateWYRPromptsBulkRequest,
  UpdateWYRPromptRequest,
} from './wyr.js';
export {
  wyrChoiceSchema,
  wyrVoteRequestSchema,
  createWyrPromptSchema,
  createWyrPromptsBulkSchema,
  updateWyrPromptSchema,
} from './wyr.js';

// Re-export Letter types
export type {
  LetterPhase,
  LetterPrompt,
  Letter,
  LetterState,
  LetterPromptResponse,
  SaveLetterRequest,
  SubmitLetterRequest,
  SubmitLetterResponse,
  LetterSubmittedMessage,
  LetterRevealReadyMessage,
  CreateLetterPromptRequest,
  UpdateLetterPromptRequest,
} from './letter.js';
export {
  saveLetterSchema,
  submitLetterSchema,
  createLetterPromptSchema,
  updateLetterPromptSchema,
} from './letter.js';

// Re-export Media types
export type {
  Photo,
  UploadSasResponse,
  PhotoListResponse,
  RegisterPhotoRequest,
  GenerateSasRequest,
} from './media.js';
export { generateSasSchema, registerPhotoSchema } from './media.js';

// Re-export Config types
export type { AppConfig } from './config.js';

// Re-export Name Game types
export type {
  NameVoteChoice,
  GeneratedName,
  NameVoteState,
  NameGameRoundResponse,
  NameGameResults,
  NameGameMatchList,
  PendingGuidanceState,
  NameGameStateResponse,
  GenerateNamesRequest,
  SubmitGuidanceRequest,
  SubmitGuidanceResponse,
  SubmitVoteRequest,
  NameVoteSubmittedMessage,
  NameRoundCompleteMessage,
  NameRoundGeneratedMessage,
  NameGuidanceSubmittedMessage,
} from './nameGame.js';
export {
  generateNamesRequestSchema,
  submitGuidanceRequestSchema,
  submitVoteRequestSchema,
} from './nameGame.js';

// Re-export Friend types
export type {
  FriendLetterRecipient,
  Friend,
  FriendThankYouNote,
  FriendLetter,
  FriendLetterStatus,
  FriendLetterCard,
  FriendDashboardResponse,
  FriendListResponse,
  FriendLettersResponse,
  CreateFriendRequest,
  CreateFriendLetterRequest,
  SaveFriendLetterRequest,
  SubmitFriendLetterRequest,
  SaveFriendThankYouNoteRequest,
  FriendLetterViewResponse,
} from './friend.js';
export {
  createFriendSchema,
  createFriendLetterSchema,
  saveFriendLetterSchema,
  submitFriendLetterSchema,
  saveFriendThankYouNoteSchema,
  friendLetterRecipientSchema,
} from './friend.js';

// Re-export Trivia types
export type {
  TriviaOption,
  TriviaPhase,
  TriviaQuestion,
  TriviaEnvelopeQuestion,
  TriviaQuestionState,
  TriviaEnvelopeResponse,
  TriviaAnswerRequest,
  TriviaAnswerResponse,
  CreateTriviaQuestionRequest,
  UpdateTriviaQuestionRequest,
  AssignQuestionsRequest,
  ReorderQuestionsRequest,
} from './trivia.js';
export {
  triviaAnswerRequestSchema,
  createTriviaQuestionSchema,
  updateTriviaQuestionSchema,
  assignQuestionsSchema,
  reorderQuestionsSchema,
} from './trivia.js';

// Re-export Gender Reveal types
export type {
  GenderValue,
  GenderRevealPhase,
  ConfigureGenderRevealRequest,
  ValidateRevealKeyRequest,
  GenderRevealStateResponse,
  ValidateKeyResponse,
  GenderRevealAdminResponse,
  GenderRevealKeyValidatedMessage,
  GenderRevealUnlockedMessage,
} from './genderReveal.js';
export {
  configureGenderRevealSchema,
  validateRevealKeySchema,
} from './genderReveal.js';

/**
 * Health check response data
 */
export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
}
