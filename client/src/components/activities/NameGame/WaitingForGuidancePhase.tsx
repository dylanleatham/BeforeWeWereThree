import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import { PULSE_OPACITY_RANGE } from '../../../constants/animation';
import './WaitingPhase.css';

/**
 * Waiting-for-guidance phase component for Name Game
 *
 * Displayed after the current user has submitted their preferences,
 * while waiting for their partner to do the same before AI generation.
 * Reuses WaitingPhase styles since the layout is identical.
 */
export function WaitingForGuidancePhase() {
  return (
    <div className="ng-waiting">
      <motion.div
        className="ng-waiting__content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span
          className="ng-waiting__message"
          animate={{ opacity: PULSE_OPACITY_RANGE }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {STRINGS.NAME_GAME_WAITING_FOR_GUIDANCE}
        </motion.span>
      </motion.div>
    </div>
  );
}
