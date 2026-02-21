import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SignJWT } from 'jose';
import type { SignalRMessage, RealtimeTransport } from 'shared';
import { logger } from '../utils/logger.js';
import { verifySession } from './session.js';

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

        // Handle joining groups (activities)
        socket.on('joinGroup', (groupName: string) => {
          socket.join(groupName);
        });

        // Handle leaving groups
        socket.on('leaveGroup', (groupName: string) => {
          socket.leave(groupName);
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
      logger.error('SignalR sendToGroup failed', {
        status: response.status,
        statusText: response.statusText,
        groupName,
      });
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
      logger.error('SignalR sendToUser failed', {
        status: response.status,
        statusText: response.statusText,
        userId,
      });
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
      logger.error('SignalR addUserToGroup failed', {
        status: response.status,
        statusText: response.statusText,
        userId,
        groupName,
      });
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
      logger.error('SignalR removeUserFromGroup failed', {
        status: response.status,
        statusText: response.statusText,
        userId,
        groupName,
      });
    }
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
      logger.error('Failed to initialize Azure SignalR', { error });
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
