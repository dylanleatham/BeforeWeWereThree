import { Router } from 'express';
import { SignJWT } from 'jose';
import { authMiddleware } from '../middleware/auth.js';
import { successResponse, errorResponse } from 'shared';
import type { SignalRNegotiateResponse } from 'shared';

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
 * Generate SignalR access token for client connection
 *
 * Returns URL and access token for client to connect to Azure SignalR Service.
 * Token includes user ID claim (asrs.s.uid) set to participant ID for targeted messaging.
 */
router.post('/negotiate', authMiddleware, async (req, res) => {
  const connectionString = process.env.SIGNALR_CONNECTION_STRING;

  if (!connectionString) {
    res.status(503).json(
      errorResponse('SIGNALR_NOT_CONFIGURED', 'Real-time features are not available')
    );
    return;
  }

  const parsed = parseConnectionString(connectionString);
  if (!parsed) {
    res.status(500).json(
      errorResponse('SIGNALR_CONFIG_ERROR', 'Invalid SignalR configuration')
    );
    return;
  }

  const { endpoint, accessKey } = parsed;
  const hub = 'sync';
  const userId = req.session!.participantId;
  const url = `${endpoint}/client/?hub=${hub}`;

  try {
    // Generate access token using jose (same pattern as session.ts)
    const token = await new SignJWT({
      'asrs.s.uid': userId, // SignalR user ID claim for targeted messaging
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setAudience(url)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(accessKey));

    res.json(successResponse<SignalRNegotiateResponse>({ url, accessToken: token }));
  } catch (error) {
    console.error('SignalR negotiate error:', error);
    res.status(500).json(
      errorResponse('SIGNALR_TOKEN_ERROR', 'Failed to generate connection token')
    );
  }
});

export { router as signalrRouter };
