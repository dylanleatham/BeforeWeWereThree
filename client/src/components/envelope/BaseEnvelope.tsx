import { useState, useCallback } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { Envelope, EnvelopeStatus } from 'shared';
import { useHaptics } from '../../hooks/useHaptics';
import {
  envelopeFlapVariants,
  contentRevealVariants,
} from '../../utils/motion';
import { EnvelopeCard } from './EnvelopeCard';
import { WouldYouRatherActivity } from '../activities/WouldYouRather';
import { LetterActivity } from '../activities/Letter/LetterActivity';
import { MediaLibraryActivity } from '../activities/MediaLibrary/MediaLibraryActivity';
import { STRINGS } from '../../constants/strings';
import { ANIMATION_DURATION_MS, CONTENT_REVEAL_DURATION } from '../../constants/animation';
import './BaseEnvelope.css';

interface BaseEnvelopeProps {
  envelope: Envelope;
  children?: React.ReactNode;
  onStatusChange?: (status: EnvelopeStatus) => void;
  onClose?: () => void;
  partnerPresent?: boolean;
}

/**
 * Full envelope component with open/close animation
 * Per CONTEXT.md:
 * - Single tap to open (not hold/swipe)
 * - 400-500ms flourish animation
 * - Haptic feedback on mobile
 */
export function BaseEnvelope({
  envelope,
  children,
  onStatusChange,
  onClose,
  partnerPresent = false,
}: BaseEnvelopeProps) {
  const [isOpen, setIsOpen] = useState(envelope.status !== 'sealed');
  const [isAnimating, setIsAnimating] = useState(false);
  const { triggerTap } = useHaptics();

  const handleOpen = useCallback(() => {
    if (envelope.status !== 'sealed' || isAnimating) return;

    // Haptic feedback
    triggerTap();

    // Start animation
    setIsAnimating(true);
    setIsOpen(true);

    // Update status after animation
    setTimeout(() => {
      setIsAnimating(false);
      onStatusChange?.('opened');
    }, ANIMATION_DURATION_MS);
  }, [envelope.status, isAnimating, onStatusChange, triggerTap]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  /**
   * Handle activity completion - marks envelope as completed
   */
  const handleActivityComplete = useCallback(() => {
    onStatusChange?.('completed');
    onClose?.();
  }, [onStatusChange, onClose]);

  /**
   * Render the appropriate activity content based on envelope type
   */
  const renderActivityContent = () => {
    // Only render activities for opened envelopes (not sealed, not completed)
    // Exception: completed WYR envelopes can reopen into summary view
    if (envelope.status !== 'opened' && !(envelope.type === 'would-you-rather' && envelope.status === 'completed')) {
      return children || (
        <p className="base-envelope__placeholder">
          {STRINGS.ENVELOPE_PLACEHOLDER}
        </p>
      );
    }

    switch (envelope.type) {
      case 'would-you-rather':
        return (
          <WouldYouRatherActivity
            envelopeId={envelope.id}
            onComplete={handleActivityComplete}
          />
        );

      case 'letter':
        return (
          <LetterActivity
            envelopeId={envelope.id}
            onComplete={handleActivityComplete}
            partnerName="Partner"
          />
        );

      case 'media':
        return (
          <MediaLibraryActivity
            envelopeId={envelope.id}
            onComplete={handleActivityComplete}
          />
        );

      // Other activity types (trivia, name-game, gender-reveal) will be added in future phases
      default:
        return children || (
          <p className="base-envelope__placeholder">
            {STRINGS.ENVELOPE_PLACEHOLDER}
          </p>
        );
    }
  };

  // If envelope is still sealed, show the card view
  if (!isOpen) {
    return (
      <EnvelopeCard
        envelope={envelope}
        partnerPresent={partnerPresent}
        onClick={handleOpen}
      />
    );
  }

  // Opened/completed state - show full envelope
  return (
    <MotionConfig reducedMotion="user">
      <motion.article
        className={clsx('base-envelope', `base-envelope--${envelope.status}`)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: CONTENT_REVEAL_DURATION }}
      >
        {/* Close button */}
        <button
          className="base-envelope__close"
          onClick={handleClose}
          aria-label={STRINGS.ENVELOPE_CLOSE_ARIA}
        >
          <X size={24} strokeWidth={1.5} />
        </button>

        {/* Envelope flap (animated on open) */}
        <motion.div
          className="base-envelope__flap"
          variants={envelopeFlapVariants}
          initial="sealed"
          animate={isAnimating ? 'opening' : isOpen ? 'opened' : 'sealed'}
          aria-hidden="true"
        />

        {/* Content area */}
        <motion.div
          className="base-envelope__content"
          variants={contentRevealVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <header className="base-envelope__header">
            <h2 className="base-envelope__title">{envelope.title}</h2>
            <span className="base-envelope__type">
              {envelope.type
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')}
            </span>
          </header>

          {/* Activity content */}
          <div className="base-envelope__body">
            {renderActivityContent()}
          </div>

          {/* Partner indicator */}
          {partnerPresent && (
            <div className="base-envelope__partner-indicator">
              <span className="base-envelope__partner-dot" />
              <span>{STRINGS.ENVELOPE_PARTNER}</span>
            </div>
          )}
        </motion.div>
      </motion.article>
    </MotionConfig>
  );
}
