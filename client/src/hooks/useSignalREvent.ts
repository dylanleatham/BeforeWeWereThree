import { useEffect, useRef } from 'react';
import { useSignalRConnection } from '../context/SignalRContext';

/**
 * Hook for subscribing to SignalR events
 *
 * Uses ref pattern to avoid stale closure issues with handlers.
 * The handler can safely reference current state without causing
 * re-subscription on every render.
 *
 * @param eventName - The SignalR event name to subscribe to
 * @param handler - Callback function when event is received
 *
 * @example
 * useSignalREvent<PartnerPresenceMessage>('partnerPresence', (data) => {
 *   setIsPartnerOnline(data.isOnline);
 * });
 */
export function useSignalREvent<T>(
  eventName: string,
  handler: (data: T) => void
): void {
  const { connection } = useSignalRConnection();
  const handlerRef = useRef(handler);

  // Keep handler ref fresh without triggering effect
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!connection) return;

    // Wrap handler to use current ref value
    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    // Subscribe to event
    connection.on(eventName, wrappedHandler);

    // Cleanup: unsubscribe on unmount or connection change
    return () => {
      connection.off(eventName, wrappedHandler);
    };
  }, [connection, eventName]);
}
