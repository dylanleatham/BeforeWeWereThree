import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { io, Socket } from 'socket.io-client';
import { negotiateRealtime, joinRealtimeGroup, leaveRealtimeGroup } from '../services/api';
import type { RealtimeTransport } from 'shared';

/**
 * Connection state enum (matches SignalR states)
 */
type ConnectionState = 'Disconnected' | 'Connecting' | 'Connected' | 'Reconnecting';

/**
 * Unified connection interface for both Socket.io and SignalR
 */
interface RealtimeConnection {
  /** Register an event handler */
  on(event: string, callback: (...args: unknown[]) => void): void;
  /** Remove an event handler */
  off(event: string, callback: (...args: unknown[]) => void): void;
  /** Join a group (for activity-specific messaging) */
  joinGroup(groupName: string): void;
  /** Leave a group */
  leaveGroup(groupName: string): void;
}

/**
 * SignalR connection context value
 * Provides connection state and access to the unified connection interface
 */
interface SignalRContextValue {
  /** The realtime connection (null if not yet connected) */
  connection: RealtimeConnection | null;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Convenience boolean for connected state */
  isConnected: boolean;
  /** Current transport type */
  transport: RealtimeTransport | null;
}

const SignalRContext = createContext<SignalRContextValue | null>(null);

interface SignalRProviderProps {
  children: ReactNode;
}

/**
 * Wrapper for Socket.io to match our unified interface
 */
function createSocketIOConnection(socket: Socket): RealtimeConnection {
  return {
    on(event: string, callback: (...args: unknown[]) => void): void {
      socket.on(event, callback);
    },
    off(event: string, callback: (...args: unknown[]) => void): void {
      socket.off(event, callback);
    },
    joinGroup(groupName: string): void {
      socket.emit('joinGroup', groupName);
    },
    leaveGroup(groupName: string): void {
      socket.emit('leaveGroup', groupName);
    },
  };
}

/**
 * Wrapper for SignalR HubConnection to match our unified interface
 * Groups are managed server-side via REST API (Azure SignalR does not
 * support client-initiated group joins via hub methods)
 */
function createSignalRConnection(hub: HubConnection): RealtimeConnection {
  return {
    on(event: string, callback: (...args: unknown[]) => void): void {
      hub.on(event, callback);
    },
    off(event: string, callback: (...args: unknown[]) => void): void {
      hub.off(event, callback);
    },
    joinGroup(groupName: string): void {
      joinRealtimeGroup(groupName).catch(console.error);
    },
    leaveGroup(groupName: string): void {
      leaveRealtimeGroup(groupName).catch(console.error);
    },
  };
}

/**
 * Real-time connection provider
 *
 * Manages the lifecycle of the real-time connection:
 * - Negotiates with backend to get transport type and credentials
 * - Establishes connection via Socket.io (local) or Azure SignalR (production)
 * - Handles automatic reconnection
 * - Cleans up on unmount
 *
 * Usage: Wrap authenticated content with this provider.
 */
export function SignalRProvider({ children }: SignalRProviderProps) {
  const [connection, setConnection] = useState<RealtimeConnection | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('Disconnected');
  const [transport, setTransport] = useState<RealtimeTransport | null>(null);

  // Keep references for cleanup
  const socketRef = useRef<Socket | null>(null);
  const hubRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    let mounted = true;

    async function connect() {
      try {
        setConnectionState('Connecting');

        // Get connection info from backend
        const negotiateResult = await negotiateRealtime();
        const { transport: transportType, url, userId, accessToken } = negotiateResult;

        if (!mounted) return;

        setTransport(transportType);

        if (transportType === 'socketio') {
          // Connect via Socket.io
          const socket = io(url, {
            auth: { userId },
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
          });

          // Named handlers so they can be removed in cleanup
          const onConnect = () => {
            if (mounted) setConnectionState('Connected');
          };
          const onDisconnect = () => {
            if (mounted) setConnectionState('Disconnected');
          };
          const onReconnecting = () => {
            if (mounted) setConnectionState('Reconnecting');
          };
          const onReconnect = () => {
            if (mounted) setConnectionState('Connected');
          };

          socket.on('connect', onConnect);
          socket.on('disconnect', onDisconnect);
          socket.on('reconnecting', onReconnecting);
          socket.on('reconnect', onReconnect);

          socketRef.current = socket;
          setConnection(createSocketIOConnection(socket));

          // Socket.io auto-connects, so we set connected state after setup
          if (socket.connected && mounted) {
            setConnectionState('Connected');
          }
        } else {
          // Connect via Azure SignalR
          const hub = new HubConnectionBuilder()
            .withUrl(url, { accessTokenFactory: () => accessToken! })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(LogLevel.Warning)
            .build();

          hub.onreconnecting(() => {
            if (mounted) {
              setConnectionState('Reconnecting');
            }
          });

          hub.onreconnected(() => {
            if (mounted) {
              setConnectionState('Connected');
            }
          });

          hub.onclose(() => {
            if (mounted) {
              setConnectionState('Disconnected');
            }
          });

          await hub.start();

          if (mounted) {
            hubRef.current = hub;
            setConnection(createSignalRConnection(hub));
            setConnectionState('Connected');
          } else {
            // Component unmounted during connect
            hub.stop();
          }
        }
      } catch (error) {
        console.error('Real-time connection failed:', error);
        if (mounted) {
          setConnectionState('Disconnected');
        }
      }
    }

    connect();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      hubRef.current?.stop();
    };
  }, []);

  return (
    <SignalRContext.Provider
      value={{
        connection,
        connectionState,
        isConnected: connectionState === 'Connected',
        transport,
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
}

/**
 * Hook to access real-time connection
 *
 * Must be used within a SignalRProvider.
 *
 * @returns SignalR context value with connection and state
 * @throws Error if used outside SignalRProvider
 */
export function useSignalRConnection(): SignalRContextValue {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalRConnection must be used within SignalRProvider');
  }
  return context;
}
