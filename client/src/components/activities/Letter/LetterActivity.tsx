import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useLetter } from '../../../hooks/useLetter';
import { ActivityStatusBar } from '../shared/ActivityStatusBar';
import { WritingPhase } from './WritingPhase';
import { WaitingPhase } from './WaitingPhase';
import { RevealPhase } from './RevealPhase';
import { CompletePhase } from './CompletePhase';
import { STRINGS } from '../../../constants/strings';
import './LetterActivity.css';

interface LetterActivityProps {
  /** Envelope ID for this activity */
  envelopeId: string;
  /** Callback when activity is complete (triggers envelope status update) */
  onComplete: () => void;
  /** Partner name for display */
  partnerName?: string;
}

/**
 * Main Letter to Baby activity component
 *
 * Orchestrates the full letter-writing experience:
 * 1. Loading state while fetching prompt
 * 2. WritingPhase - compose letter with auto-save
 * 3. WaitingPhase - waiting for partner to submit
 * 4. RevealPhase - side-by-side letter reveal
 * 5. CompletePhase - triggers onComplete callback
 *
 * Includes partner presence indicator during activity.
 */
export function LetterActivity({
  envelopeId,
  onComplete,
  partnerName = 'Partner',
}: LetterActivityProps) {
  const {
    prompt,
    phase,
    myLetter,
    revealedLetters,
    isLoading,
    error,
    isConnected,
    save,
    submit,
    advance,
    retry,
  } = useLetter({ envelopeId });

  // Track if we're in the process of submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle save from WritingPhase
   */
  const handleSave = useCallback(
    async (content: string, photoUrl: string | null) => {
      await save(content, photoUrl);
    },
    [save]
  );

  /**
   * Handle submit from WritingPhase
   */
  const handleSubmit = useCallback(async (content: string, photoUrl: string | null) => {
    setIsSubmitting(true);
    try {
      await submit(content, photoUrl);
    } finally {
      setIsSubmitting(false);
    }
  }, [submit]);

  /**
   * Handle advance from RevealPhase
   */
  const handleAdvance = useCallback(() => {
    advance();
  }, [advance]);

  /**
   * Handle close from CompletePhase
   */
  const handleClose = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Loading state
  if (isLoading) {
    return (
      <div className="letter-activity letter-activity--loading">
        <motion.div
          className="letter-activity__spinner"
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
      <div className="letter-activity letter-activity--error">
        <p className="letter-activity__error-message">
          {error || STRINGS.LETTER_ERROR_LOADING}
        </p>
        <button className="letter-activity__retry" onClick={retry}>
          {STRINGS.APP_RETRY}
        </button>
      </div>
    );
  }

  /**
   * Render phase content
   */
  const renderPhase = () => {
    switch (phase) {
      case 'writing':
        return (
          <WritingPhase
            prompt={prompt.prompt}
            initialContent={myLetter?.content ?? ''}
            initialPhotoUrl={myLetter?.photoUrl ?? null}
            onSave={handleSave}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );

      case 'waiting':
        return <WaitingPhase partnerName={partnerName} />;

      case 'revealing':
        if (!revealedLetters) return null;
        return (
          <RevealPhase
            myLetter={revealedLetters.mine}
            partnerLetter={revealedLetters.partner}
            partnerName={partnerName}
            onAdvance={handleAdvance}
          />
        );

      case 'complete':
        return <CompletePhase onClose={handleClose} />;

      default:
        return null;
    }
  };

  return (
    <div className="letter-activity">
      <ActivityStatusBar envelopeId={envelopeId} partnerName={partnerName} />

      {/* Phase content */}
      <motion.div
        className="letter-activity__content"
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
          className="letter-activity__offline-notice"
          role="status"
          aria-live="polite"
        >
          {STRINGS.LETTER_OFFLINE_NOTICE}
        </div>
      )}
    </div>
  );
}
