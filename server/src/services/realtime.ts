import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SignJWT } from 'jose';
import type { SignalRMessage, RealtimeTransport } from 'shared';
import { logger } from '../utils/logger.js';
import { verifySession } from './session.js';
import { getEnvelopeById } from '../db/queries/envelopes.js';

/**
 * Extract a named cookie value from a raw Cookie header string.
 */
function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(cookieHeader);
  return match?.[1] ?? null;
}

/**
 * Realtime service abstraction
 *
 * Provides a unified interface for real-time messaging that works with:
 * - Socket.io (local development)
 * - Azure SignalR Service (production)
 *
 * The transport is selected based on environment configuration:
 * - If SIGNALR_CONNECTION_STRING is set -> Azure SignalR
 * - Otherwise -> Socket.io (built-in)
 */

/**
 * Abstract interface for real-time messaging
 */
export interface RealtimeAdapter {
  /** Send message to all users in a group */
  sendToGroup(groupName: string, message: SignalRMessage): Promise<void>;
  /** Send message to a specific user */
  sendToUser(userId: string, message: SignalRMessage): Promise<void>;
  /** Add user to a group */
  addUserToGroup(userId: string, groupName: string): Promise<void>;
  /** Remove user from a group */
  removeUserFromGroup(userId: string, groupName: string): Promise<void>;
}

// =============================================================================
// Socket.io Adapter (Local Development)
// =============================================================================

/**
 * Socket.io adapter for local development
 * Uses in-process Socket.io server for real-time messaging
 */
class SocketIOAdapter implements RealtimeAdapter {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    // Validate session during handshake — derive userId from verified JWT
    this.io.use(async (socket, next) => {
      try {
        const cookieHeader = socket.handshake.headers.cookie;
        const sessionToken = getCookieValue(cookieHeader, 'session');

        if (!sessionToken) {
          next(new Error('Authentication required'));
          return;
        }

        const session = await verifySession(sessionToken);
        // Store verified userId on socket data so connection handler can trust it
        socket.data.userId = session.participantId;
        next();
      } catch {
        next(new Error('Invalid or expired session'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      // userId is verified by the middleware above — never trust client-provided auth
      const userId = socket.data.userId as string | undefined;

      if (userId) {
        // Track user's socket
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);

        // Auto-join session:global room for app-wide broadcasts (e.g., babymoon closed)
        socket.join('session:global');

        // Handle joining groups (activities) — validate format and verify envelope exists
        socket.on('joinGroup', async (groupName: string) => {
          if (!/^(activity:[a-z0-9-]+|session:global)$/i.test(groupName)) return;
          if (groupName === 'session:global') {
            socket.join(groupName);
            return;
          }
          const envelopeId = groupName.replace('activity:', '');
          const envelope = await getEnvelopeById(envelopeId);
          if (envelope) {
            socket.join(groupName);
          }
        });

        // Handle leaving groups — validate group name format
        socket.on('leaveGroup', (groupName: string) => {
          if (/^(activity:[a-z0-9-]+|session:global)$/i.test(groupName)) {
            socket.leave(groupName);
          }
        });

        // Cleanup on disconnect
        socket.on('disconnect', () => {
          const sockets = this.userSockets.get(userId);
          if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.userSockets.delete(userId);
            }
          }
        });
      }
    });
  }

  async sendToGroup(groupName: string, message: SignalRMessage): Promise<void> {
    // Emit to all sockets in the room
    // Format matches SignalR: target is event name, arguments[0] is data
    this.io.to(groupName).emit(message.target, message.arguments[0]);
  }

  async sendToUser(userId: string, message: SignalRMessage): Promise<void> {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        this.io.to(socketId).emit(message.target, message.arguments[0]);
      }
    }
  }

  async addUserToGroup(userId: string, groupName: string): Promise<void> {
    // In Socket.io, users join groups via client-side 'joinGroup' event
    // This is a no-op for server-initiated adds (handled by client)
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        socket?.join(groupName);
      }
    }
  }

  async removeUserFromGroup(userId: string, groupName: string): Promise<void> {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        socket?.leave(groupName);
      }
    }
  }
}

// =============================================================================
// Azure SignalR Adapter (Production)
// =============================================================================

/**
 * Parse Azure SignalR connection string
 */
function parseConnectionString(connStr: string): { endpoint: string; accessKey: string } {
  const endpointMatch = /Endpoint=(.*?);/.exec(connStr);
  const accessKeyMatch = /AccessKey=(.*?)(;|$)/.exec(connStr);

  const endpoint = endpointMatch?.[1];
  const accessKey = accessKeyMatch?.[1];

  if (!endpoint || !accessKey) {
    throw new Error('Invalid SignalR connection string format');
  }

  return { endpoint, accessKey };
}

/**
 * Azure SignalR adapter for production
 * Uses Azure SignalR REST API for server-to-client messaging
 */
class AzureSignalRAdapter implements RealtimeAdapter {
  private endpoint: string;
  private accessKey: Uint8Array;
  private hub: string;

  constructor(connectionString: string, hub = 'sync') {
    const parsed = parseConnectionString(connectionString);
    this.endpoint = parsed.endpoint;
    this.accessKey = new TextEncoder().encode(parsed.accessKey);
    this.hub = hub;
  }

  private async getAuthToken(audience: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(this.accessKey);
  }

  async sendToGroup(groupName: string, message: SignalRMessage): Promise<void> {
    const url = `${this.endpoint}/api/v1/hubs/${this.hub}/groups/${encodeURIComponent(groupName)}`;
    const token = await this.getAuthToken(url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const details = { status: response.status, statusText: response.statusText, groupName };
      logger.error('SignalR sendToGroup failed', details);
      throw new Error(`SignalR sendToGroup failed: ${response.status} ${response.statusText}`);
    }
  }

  async sendToUser(userId: string, message: SignalRMessage): Promise<void> {
    const url = `${this.endpoint}/api/v1/hubs/${this.hub}/users/${encodeURIComponent(userId)}`;
    const token = await this.getAuthToken(url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const details = { status: response.status, statusText: response.statusText, userId };
      logger.error('SignalR sendToUser failed', details);
      throw new Error(`SignalR sendToUser failed: ${response.status} ${response.statusText}`);
    }
  }

  async addUserToGroup(userId: string, groupName: string): Promise<void> {
    const url = `${this.endpoint}/api/v1/hubs/${this.hub}/groups/${encodeURIComponent(groupName)}/users/${encodeURIComponent(userId)}`;
    const token = await this.getAuthToken(url);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const details = { status: response.status, statusText: response.statusText, userId, groupName };
      logger.error('SignalR addUserToGroup failed', details);
      throw new Error(`SignalR addUserToGroup failed: ${response.status} ${response.statusText}`);
    }
  }

  async removeUserFromGroup(userId: string, groupName: string): Promise<void> {
    const url = `${this.endpoint}/api/v1/hubs/${this.hub}/groups/${encodeURIComponent(groupName)}/users/${encodeURIComponent(userId)}`;
    const token = await this.getAuthToken(url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const details = { status: response.status, statusText: response.statusText, userId, groupName };
      logger.error('SignalR removeUserFromGroup failed', details);
      throw new Error(`SignalR removeUserFromGroup failed: ${response.status} ${response.statusText}`);
    }
  }
}

// =============================================================================
// Warning Adapter (Fallback when initialization fails)
// =============================================================================

/**
 * Fallback adapter that logs a warning on every broadcast attempt.
 * Used when Azure SignalR initialization fails so the server can still start,
 * but operators are alerted that real-time features are broken.
 */
class WarningAdapter implements RealtimeAdapter {
  async sendToGroup(groupName: string): Promise<void> {
    logger.warn('Real-time disabled: sendToGroup called but SignalR failed to initialize', { groupName });
  }

  async sendToUser(userId: string): Promise<void> {
    logger.warn('Real-time disabled: sendToUser called but SignalR failed to initialize', { userId });
  }

  async addUserToGroup(userId: string, groupName: string): Promise<void> {
    logger.warn('Real-time disabled: addUserToGroup called but SignalR failed to initialize', { userId, groupName });
  }

  async removeUserFromGroup(userId: string, groupName: string): Promise<void> {
    logger.warn('Real-time disabled: removeUserFromGroup called but SignalR failed to initialize', { userId, groupName });
  }
}

// =============================================================================
// Service Initialization
// =============================================================================

let _realtimeAdapter: RealtimeAdapter | null = null;
let _transport: RealtimeTransport = 'socketio';
let _socketIO: SocketIOServer | null = null;

/**
 * Initialize the realtime service
 * Call this once during server startup with the HTTP server instance
 */
export function initializeRealtimeService(httpServer: HTTPServer): void {
  const connectionString = process.env.SIGNALR_CONNECTION_STRING;

  if (connectionString) {
    // Production: Use Azure SignalR
    try {
      _realtimeAdapter = new AzureSignalRAdapter(connectionString);
      _transport = 'signalr';
      logger.info('Realtime service initialized', { transport: 'signalr' });
    } catch (error) {
      logger.error('Failed to initialize Azure SignalR — all real-time features disabled', { error });
      _realtimeAdapter = new WarningAdapter();
      _transport = 'signalr';
    }
  } else {
    // Local development: Use Socket.io
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

    _socketIO = new SocketIOServer(httpServer, {
      cors: {
        origin: frontendUrl,
        credentials: true,
      },
      path: '/socket.io',
    });

    _realtimeAdapter = new SocketIOAdapter(_socketIO);
    _transport = 'socketio';
    logger.info('Realtime service initialized', { transport: 'socketio' });
  }
}

/**
 * Get the realtime adapter instance
 * Returns null if not initialized
 */
export function getRealtimeService(): RealtimeAdapter | null {
  return _realtimeAdapter;
}

/**
 * Get the current transport type
 */
export function getTransport(): RealtimeTransport {
  return _transport;
}

/**
 * Get the Socket.io server instance (for negotiate endpoint)
 * Returns null if using Azure SignalR
 */
export function getSocketIO(): SocketIOServer | null {
  return _socketIO;
}
