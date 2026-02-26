import { motion } from 'motion/react';
import { useGenderReveal } from '../../../hooks/useGenderReveal';
import { KeyEntryPhase } from './KeyEntryPhase';
import { WaitingPhase } from './WaitingPhase';
import { CeremonyPhase } from './CeremonyPhase';
import { KeepsakePhase } from './KeepsakePhase';
import { STRINGS } from '../../../constants/strings';
import './GenderRevealActivity.css';

interface GenderRevealActivityProps {
  /** Envelope ID for this activity */
  envelopeId: string;
  /**
   * NOTE: No onComplete prop — gender reveal envelopes NEVER complete.
   * They stay in 'opened' status forever, per CONTEXT.md.
   * Users can always return to the keepsake view.
   */
}

/**
 * Main Gender Reveal activity orchestrator
 *
 * Switches between phases based on the useGenderReveal hook state:
 * 1. Loading: spinner while fetching state
 * 2. Not-configured: message if admin hasn't set up the reveal
 * 3. Key-entry: segmented code input for entering the reveal key
 * 4. Waiting: glowing anticipation while partner enters their key
 * 5. Ceremony: full-screen reveal animation (renders above BaseEnvelope)
 * 6. Keepsake: static post-reveal view with gender result
 *
 * The ceremony phase uses position:fixed to overlay the entire screen,
 * ensuring the dramatic reveal animation is unobstructed.
 */
export function GenderRevealActivity({
  envelopeId,
}: GenderRevealActivityProps) {
  const {
    phase,
    gender,
    keysValidated,
    keyLength,
    error,
    isSubmitting,
    submitKey,
    onCeremonyComplete,
    retry,
  } = useGenderReveal({ envelopeId });

  const renderPhase = () => {
    switch (phase) {
      case 'loading':
        return (
          <div className="gender-reveal__loading" role="status">
            <motion.div
              className="gender-reveal__spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              aria-label="Loading activity"
            />
          </div>
        );

      case 'not-configured':
        return (
          <div className="gender-reveal__not-configured">
            <h2 className="gender-reveal__message-title">
              {STRINGS.REVEAL_NOT_CONFIGURED}
            </h2>
            <p className="gender-reveal__message-subtitle">
              {STRINGS.REVEAL_NOT_CONFIGURED_SUBTITLE}
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="gender-reveal__not-configured">
            <h2 className="gender-reveal__message-title">
              {error ?? STRINGS.REVEAL_LOAD_ERROR}
            </h2>
            <button
              className="gender-reveal__retry-btn"
              onClick={retry}
            >
              {STRINGS.REVEAL_LOAD_ERROR_RETRY}
            </button>
          </div>
        );

      case 'key-entry':
        return (
          <KeyEntryPhase
            onSubmit={submitKey}
            isSubmitting={isSubmitting}
            error={error}
            keyLength={keyLength}
          />
        );

      case 'waiting':
        return <WaitingPhase keysValidated={keysValidated} />;

      case 'ceremony':
        if (!gender) return null;
        return (
          <CeremonyPhase
            gender={gender}
            onComplete={onCeremonyComplete}
          />
        );

      case 'keepsake':
        if (!gender) return null;
        return <KeepsakePhase gender={gender} />;

      default:
        return null;
    }
  };

  return (
    <div className="gender-reveal">
      <motion.div
        className="gender-reveal__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        key={phase}
      >
        {renderPhase()}
      </motion.div>
    </div>
  );
}
