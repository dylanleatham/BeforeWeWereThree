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
  const wrappedHandlerRef = useRef<((...args: unknown[]) => void) | null>(null);

  // Keep handler ref fresh without triggering effect
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!connection) return;

    // Wrap handler to use current ref value, store in ref for stable cleanup
    const wrappedHandler = (...args: unknown[]) => {
      handlerRef.current(args[0] as T);
    };
    wrappedHandlerRef.current = wrappedHandler;

    // Subscribe to event
    connection.on(eventName, wrappedHandler);

    // Cleanup: unsubscribe using the ref to ensure same reference
    return () => {
      if (wrappedHandlerRef.current) {
        connection.off(eventName, wrappedHandlerRef.current);
      }
    };
  }, [connection, eventName]);
}
