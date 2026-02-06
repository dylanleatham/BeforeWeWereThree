/**
 * SignalR types for real-time synchronization
 * Used by both server and client for type-safe messaging
 */

/**
 * Response from /api/signalr/negotiate endpoint
 * Contains URL and access token for client to connect to Azure SignalR
 */
export interface SignalRNegotiateResponse {
  url: string;
  accessToken: string;
}

/**
 * Partner presence notification message
 * Sent when a partner connects or disconnects from an activity
 */
export interface PartnerPresenceMessage {
  type: 'partner_presence';
  participantId: string;
  isOnline: boolean;
}

/**
 * Base SignalR message structure for REST API
 * Used when sending messages via Azure SignalR REST API
 */
export interface SignalRMessage {
  target: string;
  arguments: unknown[];
}
