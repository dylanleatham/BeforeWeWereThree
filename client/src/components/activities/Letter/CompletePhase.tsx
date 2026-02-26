import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import './CompletePhase.css';

interface CompletePhaseProps {
  /** Called when user wants to close the activity */
  onClose: () => void;
}

/**
 * Complete phase component for Letter to Baby
 *
 * Shows a warm completion message with subtle celebration.
 * Gives the couple a moment to appreciate their letters before
 * returning to the envelope pile.
 */
export function CompletePhase({ onClose }: CompletePhaseProps) {
  return (
    <div className="letter-complete">
      <motion.div
        className="letter-complete__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Gentle glow animation */}
        <motion.div
          className="letter-complete__glow"
          animate={{
            boxShadow: [
              '0 0 0px var(--color-sunrise-gold)',
              '0 0 40px var(--color-sunrise-gold-40)',
              '0 0 0px var(--color-sunrise-gold)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: 2,
            ease: 'easeInOut',
          }}
        />

        {/* Icon */}
        <span className="letter-complete__icon" aria-hidden="true">
          {STRINGS.LETTER_COMPLETE_ICON}
        </span>

        {/* Title */}
        <h3 className="letter-complete__title">{STRINGS.LETTER_COMPLETE_TITLE}</h3>

        {/* Message */}
        <p className="letter-complete__message">{STRINGS.LETTER_COMPLETE_MESSAGE}</p>
      </motion.div>

      {/* Close button */}
      <motion.button
        type="button"
        className="letter-complete__close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        {STRINGS.LETTER_CLOSE}
      </motion.button>
    </div>
  );
}
