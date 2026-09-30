import { motion } from 'motion/react';
import { useNameGame } from '../../../hooks/useNameGame';
import { useSession } from '../../../hooks/useSession';
import { ActivityStatusBar } from '../shared/ActivityStatusBar';
import { VotingPhase } from './VotingPhase';
import { WaitingPhase } from './WaitingPhase';
import { WaitingForGuidancePhase } from './WaitingForGuidancePhase';
import { ResultsPhase } from './ResultsPhase';
import { NewRoundPhase } from './NewRoundPhase';
import { GeneratingPhase } from './GeneratingPhase';
import { STRINGS } from '../../../constants/strings';
import './NameGameActivity.css';

interface NameGameActivityProps {
  /** Envelope ID for this activity */
  envelopeId: string;
}

/**
 * Main Name Game activity orchestrator component
 *
 * Renders the correct phase based on useNameGame hook state:
 * - loading: Spinner
 * - new-round: Guidance input + generate button
 * - generating: Warm pulsing AI loading state
 * - voting: Swipeable name cards (Love/Maybe/Nope)
 * - waiting: Waiting for partner to finish voting
 * - results: Match results with categories
 *
 * Important: This activity NEVER completes — the envelope stays 'opened'
 * so users can always return to play more rounds.
 */
export function NameGameActivity({ envelopeId }: NameGameActivityProps) {
  const { participantId } = useSession();
  const {
    phase,
    currentRound,
    currentNameIndex,
    allMatches,
    results,
    roundCount,
    error,
    isConnected,
    partnerGuidanceSubmitted,
    startRound,
    vote,
    startNewRound,
    retry,
  } = useNameGame(envelopeId, participantId);

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="ng-activity ng-activity--loading">
        <motion.div
          className="ng-activity__spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          aria-label="Loading activity"
        />
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="ng-activity ng-activity--error">
        <p className="ng-activity__error-message">{error}</p>
        <button className="ng-activity__retry" onClick={retry}>
          {STRINGS.APP_RETRY}
        </button>
      </div>
    );
  }

  // Render the active phase
  const renderPhase = () => {
    switch (phase) {
      case 'new-round':
        return (
          <NewRoundPhase
            onStartRound={startRound}
            isFirstRound={roundCount === 0}
            allMatches={allMatches}
            partnerGuidanceSubmitted={partnerGuidanceSubmitted}
          />
        );

      case 'generating':
        return <GeneratingPhase />;

      case 'waiting-for-guidance':
        return <WaitingForGuidancePhase />;

      case 'voting':
        if (!currentRound) return null;
        return (
          <VotingPhase
            names={currentRound.names}
            currentIndex={currentNameIndex}
            onVote={vote}
            totalNames={currentRound.names.length}
          />
        );

      case 'waiting':
        return <WaitingPhase />;

      case 'results':
        if (!results) return null;
        return (
          <ResultsPhase
            results={results}
            onNewRound={startNewRound}
            allMatches={allMatches}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="ng-activity">
      <ActivityStatusBar envelopeId={envelopeId} />

      {/* Phase content */}
      <motion.div
        className="ng-activity__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        key={phase}
      >
        {renderPhase()}
      </motion.div>

      {/* Offline notice (non-blocking) */}
      {!isConnected && phase !== 'results' && (
        <div
          className="ng-activity__offline-notice"
          role="status"
          aria-live="polite"
        >
          {STRINGS.WYR_OFFLINE_NOTICE}
        </div>
      )}
    </div>
  );
}
