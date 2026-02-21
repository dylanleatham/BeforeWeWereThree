/**
 * Realtime service tests
 *
 * Tests the service initialization, transport detection, and adapter wiring.
 * Socket.io and Azure SignalR adapters are tested via their public interfaces.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock Socket.io
const mockEmit = jest.fn() as AnyMock;
const _mockJoin = jest.fn() as AnyMock;
const _mockLeave = jest.fn() as AnyMock;
const mockTo = jest.fn() as AnyMock;
const mockOn = jest.fn() as AnyMock;

const mockSocketIOConstructor = jest.fn() as AnyMock;

jest.unstable_mockModule('socket.io', () => ({
  Server: mockSocketIOConstructor,
}));

jest.unstable_mockModule('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setAudience: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-jwt-token' as never),
  })),
  jwtVerify: jest.fn().mockResolvedValue({ payload: {} } as never),
}));

// Mock session service (imported by realtime for Socket.io auth middleware)
const mockVerifySession = jest.fn() as AnyMock;
jest.unstable_mockModule('../../services/session.js', () => ({
  verifySession: mockVerifySession,
}));

// Mock global fetch for Azure SignalR adapter
const mockFetch = jest.fn() as AnyMock;
global.fetch = mockFetch;

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Realtime Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset Socket.io mock
    mockTo.mockReturnValue({ emit: mockEmit });
    mockSocketIOConstructor.mockReturnValue({
      on: mockOn,
      to: mockTo,
      use: jest.fn(),
      sockets: {
        sockets: new Map(),
      },
    });

    mockFetch.mockResolvedValue({ ok: true });
  });

  describe('initializeRealtimeService (Socket.io)', () => {
    it('should initialize Socket.io when no SIGNALR_CONNECTION_STRING', async () => {
      delete process.env.SIGNALR_CONNECTION_STRING;

      const { initializeRealtimeService, getTransport, getRealtimeService, getSocketIO } =
        await import('../../services/realtime.js');

      const mockHttpServer = {} as any;
      initializeRealtimeService(mockHttpServer);

      expect(getTransport()).toBe('socketio');
      expect(getRealtimeService()).not.toBeNull();
      expect(getSocketIO()).not.toBeNull();
    });
  });

  describe('initializeRealtimeService (Azure SignalR)', () => {
    it('should initialize Azure SignalR when connection string is set', async () => {
      process.env.SIGNALR_CONNECTION_STRING =
        'Endpoint=https://test.service.signalr.net;AccessKey=dGVzdGtleQ==;Version=1.0;';

      const { initializeRealtimeService, getTransport, getRealtimeService, getSocketIO } =
        await import('../../services/realtime.js');

      const mockHttpServer = {} as any;
      initializeRealtimeService(mockHttpServer);

      expect(getTransport()).toBe('signalr');
      expect(getRealtimeService()).not.toBeNull();
      expect(getSocketIO()).toBeNull();

      delete process.env.SIGNALR_CONNECTION_STRING;
    });

    it('should handle invalid connection string gracefully', async () => {
      process.env.SIGNALR_CONNECTION_STRING = 'invalid-connection-string';

      const { initializeRealtimeService, getRealtimeService } =
        await import('../../services/realtime.js');

      const mockHttpServer = {} as any;
      // Should not throw
      initializeRealtimeService(mockHttpServer);

      // Adapter should remain null since initialization failed
      expect(getRealtimeService()).toBeNull();

      delete process.env.SIGNALR_CONNECTION_STRING;
    });
  });

  describe('Azure SignalR adapter methods', () => {
    it('should send to group via REST API', async () => {
      process.env.SIGNALR_CONNECTION_STRING =
        'Endpoint=https://test.service.signalr.net;AccessKey=dGVzdGtleQ==;Version=1.0;';

      const { initializeRealtimeService, getRealtimeService } =
        await import('../../services/realtime.js');

      initializeRealtimeService({} as any);
      const adapter = getRealtimeService()!;

      await adapter.sendToGroup('test-group', {
        target: 'testEvent',
        arguments: [{ data: 'hello' }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/hubs/sync/groups/test-group'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      delete process.env.SIGNALR_CONNECTION_STRING;
    });

    it('should send to user via REST API', async () => {
      process.env.SIGNALR_CONNECTION_STRING =
        'Endpoint=https://test.service.signalr.net;AccessKey=dGVzdGtleQ==;Version=1.0;';

      const { initializeRealtimeService, getRealtimeService } =
        await import('../../services/realtime.js');

      initializeRealtimeService({} as any);
      const adapter = getRealtimeService()!;

      await adapter.sendToUser('user-1', {
        target: 'testEvent',
        arguments: [{ data: 'hello' }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/hubs/sync/users/user-1'),
        expect.objectContaining({ method: 'POST' })
      );

      delete process.env.SIGNALR_CONNECTION_STRING;
    });

    it('should add user to group via REST API', async () => {
      process.env.SIGNALR_CONNECTION_STRING =
        'Endpoint=https://test.service.signalr.net;AccessKey=dGVzdGtleQ==;Version=1.0;';

      const { initializeRealtimeService, getRealtimeService } =
        await import('../../services/realtime.js');

      initializeRealtimeService({} as any);
      const adapter = getRealtimeService()!;

      await adapter.addUserToGroup('user-1', 'group-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/groups/group-1/users/user-1'),
        expect.objectContaining({ method: 'PUT' })
      );

      delete process.env.SIGNALR_CONNECTION_STRING;
    });

    it('should remove user from group via REST API', async () => {
      process.env.SIGNALR_CONNECTION_STRING =
        'Endpoint=https://test.service.signalr.net;AccessKey=dGVzdGtleQ==;Version=1.0;';

      const { initializeRealtimeService, getRealtimeService } =
        await import('../../services/realtime.js');

      initializeRealtimeService({} as any);
      const adapter = getRealtimeService()!;

      await adapter.removeUserFromGroup('user-1', 'group-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/groups/group-1/users/user-1'),
        expect.objectContaining({ method: 'DELETE' })
      );

      delete process.env.SIGNALR_CONNECTION_STRING;
    });

    it('should log error on failed API call', async () => {
      process.env.SIGNALR_CONNECTION_STRING =
        'Endpoint=https://test.service.signalr.net;AccessKey=dGVzdGtleQ==;Version=1.0;';

      const loggerModule = await import('../../utils/logger.js');
      const { initializeRealtimeService, getRealtimeService } =
        await import('../../services/realtime.js');

      initializeRealtimeService({} as any);
      const adapter = getRealtimeService()!;

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });
      await adapter.sendToGroup('test-group', {
        target: 'testEvent',
        arguments: [{}],
      });

      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'SignalR sendToGroup failed',
        expect.objectContaining({ status: 500 })
      );

      delete process.env.SIGNALR_CONNECTION_STRING;
    });
  });
});
