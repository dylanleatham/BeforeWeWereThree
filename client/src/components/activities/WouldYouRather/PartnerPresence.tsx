import { useState, useEffect, useRef } from 'react';
import { useSignalREvent } from '../../../hooks/useSignalREvent';
import type { PartnerPresenceMessage } from 'shared';
import { STRINGS } from '../../../constants/strings';
import { PARTNER_TOAST_DURATION_MS } from '../../../constants/animation';
import './PartnerPresence.css';

interface PartnerPresenceProps {
  /** Name to display for the partner */
  partnerName?: string;
}

/**
 * Partner presence indicator component
 *
 * Shows a green/gray dot indicating whether the partner is online,
 * with toast notifications when partner joins or leaves.
 *
 * Subscribes to 'partnerPresence' SignalR events for real-time updates.
 */
export function PartnerPresence({ partnerName = 'Partner' }: PartnerPresenceProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to partner presence events
  useSignalREvent<PartnerPresenceMessage>('partnerPresence', (data) => {
    setIsOnline(data.isOnline);

    // Set toast message
    const message = data.isOnline
      ? STRINGS.WYR_PARTNER_JOINED(partnerName)
      : STRINGS.WYR_PARTNER_LEFT(partnerName);
    setToastMessage(message);
    setShowToast(true);

    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    // Auto-dismiss toast after 3 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, PARTNER_TOAST_DURATION_MS);
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="partner-presence">
        <span
          className={`partner-presence__dot ${
            isOnline ? 'partner-presence__dot--online' : ''
          }`}
          role="status"
          aria-label={isOnline ? STRINGS.WYR_PARTNER_ONLINE : STRINGS.WYR_PARTNER_OFFLINE}
        />
        <span className="partner-presence__name">{partnerName}</span>
      </div>

      {showToast && (
        <div className="partner-presence__toast" role="alert">
          {toastMessage}
        </div>
      )}
    </>
  );
}
