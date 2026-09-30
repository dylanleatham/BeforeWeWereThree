import { useState, useEffect, useRef } from 'react';
import { useSignalREvent } from '../../../hooks/useSignalREvent';
import { useSignalRConnection } from '../../../context/SignalRContext';
import type { PartnerPresenceMessage } from 'shared';
import { STRINGS } from '../../../constants/strings';
import { PARTNER_TOAST_DURATION_MS } from '../../../constants/animation';
import './PartnerPresence.css';

interface PartnerPresenceProps {
  /** Envelope whose activity room to report on */
  envelopeId: string;
  /** Name to display for the partner */
  partnerName?: string;
}

/**
 * Partner presence indicator
 *
 * Says in words whether the partner has this activity open, with a dot as a secondary cue,
 * and shows a toast when they arrive or leave.
 *
 * Renders nothing until the server reports presence. It sends a snapshot when the activity
 * is joined, and again when asked on mount, because activities usually mount this after a
 * loading state, once that first snapshot has gone by. A transport without presence (Azure
 * SignalR in REST mode) never answers, so "unknown" never reads as "away".
 */
export function PartnerPresence({ envelopeId, partnerName = STRINGS.PARTNER_DEFAULT_NAME }: PartnerPresenceProps) {
  const { connection } = useSignalRConnection();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSignalREvent<PartnerPresenceMessage>('partnerPresence', (data) => {
    setIsOnline(data.isOnline);
    if (data.snapshot) return;

    setToastMessage(
      data.isOnline ? STRINGS.WYR_PARTNER_JOINED(partnerName) : STRINGS.WYR_PARTNER_LEFT(partnerName)
    );
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), PARTNER_TOAST_DURATION_MS);
  });

  useEffect(() => {
    connection?.queryPresence(`activity:${envelopeId}`);
  }, [connection, envelopeId]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  if (isOnline === null) return null;

  return (
    <>
      <div className="partner-presence" role="status">
        <span
          className={`partner-presence__dot ${isOnline ? 'partner-presence__dot--online' : ''}`}
          aria-hidden="true"
        />
        <span className="partner-presence__label">
          {isOnline ? STRINGS.PRESENCE_HERE(partnerName) : STRINGS.PRESENCE_AWAY(partnerName)}
        </span>
      </div>

      {toastMessage && (
        <div className="partner-presence__toast" role="alert">
          {toastMessage}
        </div>
      )}
    </>
  );
}
