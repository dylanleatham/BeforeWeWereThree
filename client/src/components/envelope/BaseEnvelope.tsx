import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { X, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import type { Envelope, EnvelopeStatus } from 'shared';
import { useHaptics } from '../../hooks/useHaptics';
import {
  envelopeFlapVariants,
  contentRevealVariants,
} from '../../utils/motion';
import { formatEnvelopeTypeLabel } from '../../utils/envelope';
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
 *
 * Always renders the full envelope view (no intermediate card tap).
 * If the envelope is sealed on mount, plays the flap animation
 * and auto-triggers the status change to 'opened'.
 */
export function BaseEnvelope({
  envelope,
  children,
  onStatusChange,
  onClose,
  partnerPresent = false,
}: BaseEnvelopeProps) {
  const isEvergreen = EVERGREEN_ENVELOPE_TYPES.has(envelope.type);
  // Capture initial sealed state once — useState initializer only runs on first render
  const [wasSealed] = useState(() => envelope.status === 'sealed');
  const [isAnimating, setIsAnimating] = useState(!isEvergreen && wasSealed);
  const { triggerTap } = useHaptics();
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-open sealed envelopes on mount with flap animation
  useEffect(() => {
    if (!wasSealed || isEvergreen) return;

    triggerTap();

    openTimerRef.current = setTimeout(() => {
      setIsAnimating(false);
      onStatusChange?.('opened');
    }, ANIMATION_DURATION_MS);

    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleReopen = useCallback(() => {
    onStatusChange?.('opened');
  }, [onStatusChange]);

  /**
   * Handle activity completion - marks envelope as completed
   */
  const handleActivityComplete = useCallback(() => {
    onStatusChange?.('completed');
    onClose?.();
  }, [onStatusChange, onClose]);

  /**
   * Check if an envelope should render its activity content.
   * Since BaseEnvelope always shows the full view now, we render the activity
   * for all non-sealed envelopes. Sealed envelopes that just entered detail
   * mode are in the process of opening (status change pending after animation).
   */
  const shouldRenderActivity = (env: Envelope): boolean => {
    if (env.type === 'name-game') return true;
    if (env.type === 'gender-reveal') return true;
    // Sealed envelopes entering detail mode are auto-opening — render activity
    if (wasSealed) return true;
    return env.status === 'opened' || env.status === 'completed';
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

  return (
    <MotionConfig reducedMotion="user">
      <motion.article
        className={clsx('base-envelope', `base-envelope--${envelope.status}`, `envelope-card--type-${envelope.type}`)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: CONTENT_REVEAL_DURATION }}
      >
        {/* Envelope action buttons */}
        <div className="base-envelope__actions">
          {envelope.status === 'completed' && !isEvergreen && (
            <button
              className="base-envelope__reopen"
              onClick={handleReopen}
              aria-label={STRINGS.ENVELOPE_REOPEN_ARIA}
              title={STRINGS.ENVELOPE_REOPEN}
            >
              <RotateCcw size={20} strokeWidth={1.5} />
            </button>
          )}
          <button
            className="base-envelope__close"
            onClick={handleClose}
            aria-label={STRINGS.ENVELOPE_CLOSE_ARIA}
          >
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Envelope flap (animated on open, hidden for evergreen) */}
        {!isEvergreen && (
          <motion.div
            className="base-envelope__flap"
            variants={envelopeFlapVariants}
            initial={wasSealed ? 'sealed' : 'opened'}
            animate={isAnimating ? 'opening' : 'opened'}
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
