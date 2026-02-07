import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import './CompletePhase.css';

interface CompletePhaseProps {
  /** Whether the choices matched */
  isMatch: boolean;
  /** Called when user wants to close the activity */
  onClose: () => void;
}

/**
 * Complete phase component for Would You Rather
 *
 * Shows a warm completion message before returning to the envelope pile.
 * Gives the couple a moment to reflect on their choices.
 */
export function CompletePhase({ isMatch, onClose }: CompletePhaseProps) {
  return (
    <div className="wyr-complete">
      <motion.div
        className="wyr-complete__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <span className="wyr-complete__icon" aria-hidden="true">
          {isMatch ? STRINGS.WYR_COMPLETE_ICON_MATCH : STRINGS.WYR_COMPLETE_ICON}
        </span>
        <h3 className="wyr-complete__title">{STRINGS.WYR_COMPLETE_TITLE}</h3>
        <p className="wyr-complete__message">
          {isMatch ? STRINGS.WYR_COMPLETE_MESSAGE_MATCH : STRINGS.WYR_COMPLETE_MESSAGE}
        </p>
      </motion.div>

      <motion.button
        className="wyr-complete__close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        {STRINGS.WYR_COMPLETE_CLOSE}
      </motion.button>
    </div>
  );
}
