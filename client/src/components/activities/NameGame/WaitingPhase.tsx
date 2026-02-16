import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import { PULSE_OPACITY_RANGE } from '../../../constants/animation';
import './WaitingPhase.css';

/**
 * Waiting phase component for Name Game
 *
 * Displayed after the current user has finished voting on all names,
 * while waiting for their partner to finish. Uses the same breathing
 * animation pattern as WYR WaitingPhase.
 */
export function WaitingPhase() {
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
          animate={{ opacity: PULSE_OPACITY_RANGE as unknown as number[] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {STRINGS.NAME_GAME_WAITING}
        </motion.span>
      </motion.div>
    </div>
  );
}
