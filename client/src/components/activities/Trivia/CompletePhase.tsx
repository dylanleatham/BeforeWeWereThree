import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import './CompletePhase.css';

interface CompletePhaseProps {
  /** Called when user wants to close the activity */
  onClose: () => void;
}

/**
 * Complete phase for Trivia activity
 *
 * Warm completion screen shown after all questions are answered.
 * Follows the same pattern as WYR CompletePhase.
 */
export function CompletePhase({ onClose }: CompletePhaseProps) {
  return (
    <div className="trivia-complete">
      <motion.div
        className="trivia-complete__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <span className="trivia-complete__icon" aria-hidden="true">
          {'\u2728'}
        </span>
        <h3 className="trivia-complete__title">{STRINGS.TRIVIA_COMPLETE_TITLE}</h3>
        <p className="trivia-complete__message">{STRINGS.TRIVIA_COMPLETE_MESSAGE}</p>
      </motion.div>

      <motion.button
        type="button"
        className="trivia-complete__close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        {STRINGS.TRIVIA_COMPLETE_CLOSE}
      </motion.button>
    </div>
  );
}
