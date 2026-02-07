import { motion } from 'motion/react';
import { useWouldYouRather } from '../../../hooks/useWouldYouRather';
import { PartnerPresence } from './PartnerPresence';
import { VotingPhase } from './VotingPhase';
import { WaitingPhase } from './WaitingPhase';
import { RevealPhase } from './RevealPhase';
import { CompletePhase } from './CompletePhase';
import { STRINGS } from '../../../constants/strings';
import './WouldYouRatherActivity.css';

interface WouldYouRatherActivityProps {
  /** Envelope ID for this activity */
  envelopeId: string;
  /** Callback when activity is complete (triggers envelope status update) */
  onComplete: () => void;
  /** Partner name for display */
  partnerName?: string;
}

/**
 * Main Would You Rather activity component
 *
 * Orchestrates the full WYR experience:
 * 1. Loading state while fetching prompt
 * 2. VotingPhase - tap to choose
 * 3. WaitingPhase - waiting for partner
 * 4. RevealPhase - side-by-side reveal
 * 5. Complete - triggers onComplete callback
 *
 * Includes partner presence indicator during activity.
 */
export function WouldYouRatherActivity({
  envelopeId,
  onComplete,
  partnerName = 'Partner',
}: WouldYouRatherActivityProps) {
  const {
    prompt,
    phase,
    myVote,
    results,
    isLoading,
    error,
    isConnected,
    vote,
    advance,
    retry,
  } = useWouldYouRather({ envelopeId });

  // Handle advance from reveal to complete phase
  const handleAdvance = () => {
    advance();
  };

  // Handle close from complete phase - call parent onComplete
  const handleClose = () => {
    onComplete();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="wyr-activity wyr-activity--loading">
        <motion.div
          className="wyr-activity__spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          aria-label="Loading activity"
        />
      </div>
    );
  }

  // Error state
  if (error || !prompt) {
    return (
      <div className="wyr-activity wyr-activity--error">
        <p className="wyr-activity__error-message">
          {error || STRINGS.WYR_ERROR_LOADING}
        </p>
        <button className="wyr-activity__retry" onClick={retry}>
          {STRINGS.APP_RETRY}
        </button>
      </div>
    );
  }

  // Render phase content
  const renderPhase = () => {
    switch (phase) {
      case 'voting':
        return (
          <VotingPhase
            optionA={prompt.optionA}
            optionB={prompt.optionB}
            onVote={vote}
          />
        );

      case 'waiting':
        return (
          <WaitingPhase
            partnerName={partnerName}
            myChoice={myVote!}
          />
        );

      case 'revealing':
        if (!results) return null;
        return (
          <RevealPhase
            optionA={prompt.optionA}
            optionB={prompt.optionB}
            results={results}
            onAdvance={handleAdvance}
          />
        );

      case 'complete':
        return (
          <CompletePhase
            isMatch={results?.isMatch ?? false}
            onClose={handleClose}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="wyr-activity">
      {/* Header with partner presence */}
      <header className="wyr-activity__header">
        <PartnerPresence partnerName={partnerName} />
      </header>

      {/* Phase content */}
      <motion.div
        className="wyr-activity__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        key={phase}
      >
        {renderPhase()}
      </motion.div>

      {/* Offline notice (non-blocking) */}
      {!isConnected && phase !== 'revealing' && phase !== 'complete' && (
        <div
          className="wyr-activity__offline-notice"
          role="status"
          aria-live="polite"
        >
          {STRINGS.WYR_OFFLINE_NOTICE}
        </div>
      )}
    </div>
  );
}
