import { Router } from 'express';
import { SignJWT } from 'jose';
import { authMiddleware } from '../middleware/auth.js';
import { successResponse } from 'shared';
import type { RealtimeNegotiateResponse } from 'shared';
import { getTransport } from '../services/realtime.js';

const router = Router();

/**
 * Parse Azure SignalR connection string
 * Format: Endpoint=https://xxx.service.signalr.net;AccessKey=xxx;
 */
function parseConnectionString(connStr: string): { endpoint: string; accessKey: string } | null {
  const endpointMatch = /Endpoint=(.*?);/.exec(connStr);
  const accessKeyMatch = /AccessKey=(.*?)(;|$)/.exec(connStr);

  const endpoint = endpointMatch?.[1];
  const accessKey = accessKeyMatch?.[1];

  if (!endpoint || !accessKey) {
    return null;
  }

  return { endpoint, accessKey };
}

/**
 * POST /negotiate
 * Get connection info for real-time messaging
 *
 * Returns transport type and connection details:
 * - For Socket.io: transport='socketio', url to connect to
 * - For Azure SignalR: transport='signalr', url and accessToken
 */
router.post('/negotiate', authMiddleware, async (req, res) => {
  const transport = getTransport();
  const userId = req.session!.participantId;

  if (transport === 'socketio') {
    // Socket.io: Return the backend URL for Socket.io connection
    // In development, this will be proxied by Vite
    const protocol = req.protocol;
    const host = req.get('host') ?? 'localhost:3000';
    const url = `${protocol}://${host}`;

    res.json(successResponse<RealtimeNegotiateResponse>({
      transport: 'socketio',
      url,
      userId,
    }));
    return;
  }

  // Azure SignalR
  const connectionString = process.env.SIGNALR_CONNECTION_STRING;
  if (!connectionString) {
    // This shouldn't happen if transport is 'signalr', but handle it gracefully
    res.status(503).json({
      success: false,
      error: { code: 'SIGNALR_NOT_CONFIGURED', message: 'Real-time features are not available' },
    });
    return;
  }

  const parsed = parseConnectionString(connectionString);
  if (!parsed) {
    res.status(500).json({
      success: false,
      error: { code: 'SIGNALR_CONFIG_ERROR', message: 'Invalid SignalR configuration' },
    });
    return;
  }

  const { endpoint, accessKey } = parsed;
  const hub = 'sync';
  const url = `${endpoint}/client/?hub=${hub}`;

  try {
    // Generate access token for Azure SignalR
    const accessToken = await new SignJWT({
      'asrs.s.uid': userId, // SignalR user ID claim for targeted messaging
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setAudience(url)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(accessKey));

    res.json(successResponse<RealtimeNegotiateResponse>({
      transport: 'signalr',
      url,
      accessToken,
      userId,
    }));
  } catch (error) {
    console.error('SignalR negotiate error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SIGNALR_TOKEN_ERROR', message: 'Failed to generate connection token' },
    });
  }
});

export { router as signalrRouter };
