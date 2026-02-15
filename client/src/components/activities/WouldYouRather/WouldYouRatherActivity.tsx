import { motion } from 'motion/react';
import { useWouldYouRather } from '../../../hooks/useWouldYouRather';
import { PartnerPresence } from './PartnerPresence';
import { VotingPhase } from './VotingPhase';
import { WaitingPhase } from './WaitingPhase';
import { RevealPhase } from './RevealPhase';
import { CompletePhase } from './CompletePhase';
import { SummaryPhase } from './SummaryPhase';
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
 * Orchestrates the full WYR experience with multi-prompt support:
 * 1. Loading state while fetching prompts
 * 2. Per-prompt cycle: VotingPhase -> WaitingPhase -> RevealPhase
 * 3. CompletePhase with match statistics
 * 4. SummaryPhase for reopened completed envelopes
 */
export function WouldYouRatherActivity({
  envelopeId,
  onComplete,
  partnerName = 'Partner',
}: WouldYouRatherActivityProps) {
  const {
    prompts,
    currentPrompt,
    currentIndex,
    totalPrompts,
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

  const handleAdvance = () => {
    advance();
  };

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
  if (error || !currentPrompt) {
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

  const isLastPrompt = currentIndex === totalPrompts - 1;

  // Render phase content
  const renderPhase = () => {
    switch (phase) {
      case 'voting':
        return (
          <VotingPhase
            optionA={currentPrompt.prompt.optionA}
            optionB={currentPrompt.prompt.optionB}
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
            optionA={currentPrompt.prompt.optionA}
            optionB={currentPrompt.prompt.optionB}
            results={results}
            onAdvance={handleAdvance}
            isLastPrompt={isLastPrompt}
          />
        );

      case 'complete':
        return (
          <CompletePhase
            prompts={prompts}
            onClose={handleClose}
          />
        );

      case 'summary':
        return (
          <SummaryPhase
            prompts={prompts}
            onClose={handleClose}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="wyr-activity">
      {/* Header with partner presence and progress */}
      <header className="wyr-activity__header">
        <PartnerPresence partnerName={partnerName} />
        {totalPrompts > 1 && phase !== 'complete' && phase !== 'summary' && (
          <span className="wyr-activity__progress">
            {STRINGS.WYR_PROGRESS(currentIndex + 1, totalPrompts)}
          </span>
        )}
      </header>

      {/* Phase content */}
      <motion.div
        className="wyr-activity__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        key={`${phase}-${currentIndex}`}
      >
        {renderPhase()}
      </motion.div>

      {/* Offline notice (non-blocking) */}
      {!isConnected && phase !== 'revealing' && phase !== 'complete' && phase !== 'summary' && (
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
