import { SignJWT } from 'jose';
import type { SignalRMessage } from 'shared';

/**
 * SignalR REST API client for Azure SignalR Service
 * Used to send messages to clients via REST API
 *
 * Pattern: Server uses REST API to send, clients use WebSocket to receive
 * Reference: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-reference-data-plane-rest-api
 */

/**
 * Parse Azure SignalR connection string
 * Format: Endpoint=https://xxx.service.signalr.net;AccessKey=xxx;
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

export class SignalRService {
  private endpoint: string;
  private accessKey: Uint8Array;
  private hub: string;

  constructor(connectionString: string, hub = 'sync') {
    const parsed = parseConnectionString(connectionString);
    this.endpoint = parsed.endpoint;
    this.accessKey = new TextEncoder().encode(parsed.accessKey);
    this.hub = hub;
  }

  /**
   * Generate JWT token for REST API authentication
   * Azure SignalR REST API requires JWT with audience set to the API URL
   */
  async getAuthToken(audience: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(this.accessKey);
  }

  /**
   * Send message to all users in a group
   * @param groupName - Group identifier (e.g., 'activity:envelope-id')
   * @param message - Message with target method and arguments
   */
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
      console.error(`SignalR sendToGroup failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send message to a specific user
   * @param userId - User identifier (matches 'asrs.s.uid' claim from negotiate)
   * @param message - Message with target method and arguments
   */
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
      console.error(`SignalR sendToUser failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Add user to a group
   * @param userId - User identifier
   * @param groupName - Group to add user to
   */
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
      console.error(`SignalR addUserToGroup failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Remove user from a group
   * @param userId - User identifier
   * @param groupName - Group to remove user from
   */
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
      console.error(`SignalR removeUserFromGroup failed: ${response.status} ${response.statusText}`);
    }
  }
}

/**
 * Lazy-initialized singleton SignalR service
 * Gracefully handles missing connection string (logs warning, doesn't crash)
 */
let _signalrService: SignalRService | null = null;

export function getSignalRService(): SignalRService | null {
  if (_signalrService) {
    return _signalrService;
  }

  const connectionString = process.env.SIGNALR_CONNECTION_STRING;
  if (!connectionString) {
    console.warn('SIGNALR_CONNECTION_STRING not set - real-time features disabled');
    return null;
  }

  try {
    _signalrService = new SignalRService(connectionString);
    return _signalrService;
  } catch (error) {
    console.error('Failed to initialize SignalR service:', error);
    return null;
  }
}

// Export singleton accessor
export const signalrService = {
  get instance(): SignalRService | null {
    return getSignalRService();
  },
};
