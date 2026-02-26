import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { Envelope, EnvelopeStatus } from 'shared';
import { useHaptics } from '../../hooks/useHaptics';
import {
  envelopeFlapVariants,
  contentRevealVariants,
} from '../../utils/motion';
import { formatEnvelopeTypeLabel } from '../../utils/envelope';
import { EnvelopeCard } from './EnvelopeCard';
import { WouldYouRatherActivity } from '../activities/WouldYouRather';
import { LetterActivity } from '../activities/Letter/LetterActivity';
import { MediaLibraryActivity } from '../activities/MediaLibrary/MediaLibraryActivity';
import { NameGameActivity } from '../activities/NameGame';
import { TriviaActivity } from '../activities/Trivia';
import { GenderRevealActivity } from '../activities/GenderReveal/GenderRevealActivity';
import { PhotoPromptActivity } from '../activities/PhotoPrompt';
import { FriendLetterView } from '../friend/FriendLetterView';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { STRINGS } from '../../constants/strings';
import { EVERGREEN_ENVELOPE_TYPES } from '../../constants/config';
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
  const isEvergreen = EVERGREEN_ENVELOPE_TYPES.has(envelope.type);
  const [isOpen, setIsOpen] = useState(isEvergreen || envelope.status !== 'sealed');
  const [isAnimating, setIsAnimating] = useState(false);
  const { triggerTap } = useHaptics();
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up open animation timer on unmount
  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
    };
  }, []);

  const handleOpen = useCallback(() => {
    if (isEvergreen || envelope.status !== 'sealed' || isAnimating) return;

    // Haptic feedback
    triggerTap();

    // Start animation
    setIsAnimating(true);
    setIsOpen(true);

    // Update status after animation
    openTimerRef.current = setTimeout(() => {
      setIsAnimating(false);
      onStatusChange?.('opened');
    }, ANIMATION_DURATION_MS);
  }, [isEvergreen, envelope.status, isAnimating, onStatusChange, triggerTap]);

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
   * Check if an envelope should render its activity content.
   * name-game never completes; WYR shows summary when completed; others only when opened.
   */
  const shouldRenderActivity = (env: Envelope): boolean => {
    if (env.type === 'name-game') return true;
    if (env.type === 'gender-reveal') return true;
    if (env.type === 'would-you-rather' && env.status === 'completed') return true;
    if (env.type === 'trivia' && env.status === 'completed') return true;
    if (env.type === 'friend-letter' && env.status === 'completed') return true;
    if (env.type === 'photo-prompt' && env.status === 'completed') return true;
    return env.status === 'opened';
  };

  /**
   * Render the appropriate activity content based on envelope type
   */
  const renderActivityContent = () => {
    if (!shouldRenderActivity(envelope)) {
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
            partnerName={STRINGS.LETTER_PARTNER_NAME}
          />
        );

      case 'media':
        return (
          <MediaLibraryActivity
            envelopeId={envelope.id}
            onComplete={handleActivityComplete}
          />
        );

      case 'trivia':
        return (
          <TriviaActivity
            envelopeId={envelope.id}
            onComplete={handleActivityComplete}
          />
        );

      case 'name-game':
        return (
          <NameGameActivity
            envelopeId={envelope.id}
          />
        );

      case 'gender-reveal':
        return (
          <GenderRevealActivity
            envelopeId={envelope.id}
          />
        );

      case 'photo-prompt':
        return (
          <PhotoPromptActivity
            envelopeId={envelope.id}
            onComplete={handleActivityComplete}
          />
        );

      case 'friend-letter':
        if (envelope.friendLetterId) {
          return (
            <FriendLetterView
              friendLetterId={envelope.friendLetterId}
              onComplete={handleActivityComplete}
            />
          );
        }
        return null;

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
        className={clsx('base-envelope', `base-envelope--${envelope.status}`, `envelope-card--type-${envelope.type}`)}
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

        {/* Envelope flap (animated on open, hidden for evergreen) */}
        {!isEvergreen && (
          <motion.div
            className="base-envelope__flap"
            variants={envelopeFlapVariants}
            initial="sealed"
            animate={isAnimating ? 'opening' : isOpen ? 'opened' : 'sealed'}
            aria-hidden="true"
          />
        )}

        {/* Content area */}
        <motion.div
          className={clsx('base-envelope__content', isEvergreen && 'base-envelope__content--no-flap')}
          variants={contentRevealVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <header className="base-envelope__header">
            <h2 className="base-envelope__title">{envelope.title}</h2>
            <span className="base-envelope__type">
              {formatEnvelopeTypeLabel(envelope.type)}
            </span>
          </header>

          {/* Activity content */}
          <div className="base-envelope__body">
            <ErrorBoundary
              fallback={
                <div className="base-envelope__error">
                  <p>{STRINGS.ERROR_BOUNDARY_MESSAGE}</p>
                  <button type="button" onClick={handleClose}>
                    {STRINGS.ENVELOPE_CLOSE_ARIA}
                  </button>
                </div>
              }
            >
              {renderActivityContent()}
            </ErrorBoundary>
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
