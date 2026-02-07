/**
 * Real-time messaging types
 * Used by both server and client for type-safe messaging
 * Supports both Socket.io (local dev) and Azure SignalR (production)
 */

/** Transport type for real-time messaging */
export type RealtimeTransport = 'socketio' | 'signalr';

/**
 * Response from /api/signalr/negotiate endpoint
 * Contains transport type and connection details
 */
export interface RealtimeNegotiateResponse {
  /** Transport type: 'socketio' for local dev, 'signalr' for production */
  transport: RealtimeTransport;
  /** URL to connect to */
  url: string;
  /** User ID for the connection */
  userId: string;
  /** Access token (only for Azure SignalR) */
  accessToken?: string;
}

/**
 * @deprecated Use RealtimeNegotiateResponse instead
 * Legacy type kept for backwards compatibility
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
