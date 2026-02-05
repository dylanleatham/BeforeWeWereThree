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
    }, 500);
  }, [envelope.status, isAnimating, onStatusChange, triggerTap]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

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
        transition={{ duration: 0.25 }}
      >
        {/* Close button */}
        <button
          className="base-envelope__close"
          onClick={handleClose}
          aria-label="Close envelope"
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

          {/* Activity content (passed as children) */}
          <div className="base-envelope__body">
            {children || (
              <p className="base-envelope__placeholder">
                Activity content will appear here
              </p>
            )}
          </div>

          {/* Partner indicator */}
          {partnerPresent && (
            <div className="base-envelope__partner-indicator">
              <span className="base-envelope__partner-dot" />
              <span>Partner is here</span>
            </div>
          )}
        </motion.div>
      </motion.article>
    </MotionConfig>
  );
}
