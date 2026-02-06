import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { negotiateSignalR } from '../services/api';

/**
 * SignalR connection context value
 * Provides connection state and access to the HubConnection
 */
interface SignalRContextValue {
  /** The SignalR hub connection (null if not yet connected) */
  connection: HubConnection | null;
  /** Current connection state */
  connectionState: HubConnectionState;
  /** Convenience boolean for connected state */
  isConnected: boolean;
}

const SignalRContext = createContext<SignalRContextValue | null>(null);

interface SignalRProviderProps {
  children: ReactNode;
}

/**
 * SignalR connection provider
 *
 * Manages the lifecycle of the SignalR connection:
 * - Negotiates with backend to get access token
 * - Establishes connection to Azure SignalR Service
 * - Handles automatic reconnection
 * - Cleans up on unmount
 *
 * Usage: Wrap authenticated content with this provider.
 * Only connect when user is authenticated.
 */
export function SignalRProvider({ children }: SignalRProviderProps) {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState(HubConnectionState.Disconnected);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    let mounted = true;

    async function connect() {
      try {
        // Get negotiation info from backend
        const { url, accessToken } = await negotiateSignalR();

        const conn = new HubConnectionBuilder()
          .withUrl(url, { accessTokenFactory: () => accessToken })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(LogLevel.Warning)
          .build();

        // Handle reconnection state changes
        conn.onreconnecting(() => {
          if (mounted) {
            setConnectionState(HubConnectionState.Reconnecting);
          }
        });

        conn.onreconnected(() => {
          if (mounted) {
            setConnectionState(HubConnectionState.Connected);
          }
        });

        conn.onclose(() => {
          if (mounted) {
            setConnectionState(HubConnectionState.Disconnected);
          }
        });

        // Start the connection
        await conn.start();

        if (mounted) {
          connectionRef.current = conn;
          setConnection(conn);
          setConnectionState(HubConnectionState.Connected);
        } else {
          // Component unmounted during connect - stop immediately
          conn.stop();
        }
      } catch (error) {
        console.error('SignalR connection failed:', error);
        if (mounted) {
          setConnectionState(HubConnectionState.Disconnected);
        }
      }
    }

    connect();

    return () => {
      mounted = false;
      connectionRef.current?.stop();
    };
  }, []);

  return (
    <SignalRContext.Provider
      value={{
        connection,
        connectionState,
        isConnected: connectionState === HubConnectionState.Connected,
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
}

/**
 * Hook to access SignalR connection
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
