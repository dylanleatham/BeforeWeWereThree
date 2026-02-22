import { Router } from 'express';
import { SignJWT } from 'jose';
import { authMiddleware } from '../middleware/auth.js';
import { successResponse, errorResponse } from 'shared';
import { getEnvelopeById } from '../db/queries/envelopes.js';
import type { RealtimeNegotiateResponse } from 'shared';
import { getTransport, getRealtimeService } from '../services/realtime.js';
import { logger } from '../utils/logger.js';

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
    res.status(503).json(errorResponse('SIGNALR_NOT_CONFIGURED', 'Real-time features are not available'));
    return;
  }

  const parsed = parseConnectionString(connectionString);
  if (!parsed) {
    res.status(500).json(errorResponse('SIGNALR_CONFIG_ERROR', 'Invalid SignalR configuration'));
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
    logger.error('SignalR negotiate error', { error });
    res.status(500).json(errorResponse('SIGNALR_TOKEN_ERROR', 'Failed to generate connection token'));
  }
});

/**
 * POST /groups/join
 * Join a real-time group for activity-specific messaging
 * Used by Azure SignalR transport where groups are managed server-side
 */
router.post('/groups/join', authMiddleware, async (req, res) => {
  try {
    const { groupName } = req.body;
    if (!groupName || typeof groupName !== 'string') {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'groupName is required'));
      return;
    }
    if (!/^activity:[a-z0-9-]+$/i.test(groupName)) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid group name format'));
      return;
    }

    // Verify the envelope exists before allowing group join
    const envelopeId = groupName.replace('activity:', '');
    const envelope = await getEnvelopeById(envelopeId);
    if (!envelope) {
      res.status(404).json(errorResponse('ENVELOPE_NOT_FOUND', 'Envelope not found'));
      return;
    }

    const userId = req.session!.participantId;
    const realtime = getRealtimeService();
    if (!realtime) {
      res.status(503).json(errorResponse('SERVICE_UNAVAILABLE', 'Real-time service not available'));
      return;
    }

    await realtime.addUserToGroup(userId, groupName);
    res.json(successResponse({ joined: true }));
  } catch (error) {
    logger.error('Failed to join group', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to join group'));
  }
});

/**
 * POST /groups/leave
 * Leave a real-time group
 */
router.post('/groups/leave', authMiddleware, async (req, res) => {
  try {
    const { groupName } = req.body;
    if (!groupName || typeof groupName !== 'string') {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'groupName is required'));
      return;
    }
    if (!/^activity:[a-z0-9-]+$/i.test(groupName)) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid group name format'));
      return;
    }

    const userId = req.session!.participantId;
    const realtime = getRealtimeService();
    if (!realtime) {
      res.status(503).json(errorResponse('SERVICE_UNAVAILABLE', 'Real-time service not available'));
      return;
    }

    await realtime.removeUserFromGroup(userId, groupName);
    res.json(successResponse({ left: true }));
  } catch (error) {
    logger.error('Failed to leave group', { error });
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to leave group'));
  }
});

export { router as signalrRouter };
