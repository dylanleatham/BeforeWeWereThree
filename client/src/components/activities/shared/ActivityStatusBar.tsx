import { PartnerPresence } from './PartnerPresence';
import './ActivityStatusBar.css';

interface ActivityStatusBarProps {
  /** Envelope whose activity this bar belongs to */
  envelopeId: string;
  /** Name to display for the partner */
  partnerName?: string;
  /** Progress label such as "2 of 5"; omitted when there is nothing to count */
  progress?: string;
}

/**
 * Status row at the top of a two-person activity: partner presence on the left,
 * progress on the right. It sits in the flow of the envelope content, so it never
 * overlaps the activity or the envelope's close button.
 */
export function ActivityStatusBar({ envelopeId, partnerName, progress }: ActivityStatusBarProps) {
  return (
    <div className="activity-status-bar">
      <PartnerPresence envelopeId={envelopeId} partnerName={partnerName} />
      {progress && <span className="activity-status-bar__progress">{progress}</span>}
    </div>
  );
}
