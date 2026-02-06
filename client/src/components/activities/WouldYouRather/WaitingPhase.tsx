import { motion } from 'motion/react';
import type { WYRChoice } from 'shared';
import { STRINGS } from '../../../constants/strings';
import './WaitingPhase.css';

interface WaitingPhaseProps {
  /** Name of the partner we're waiting for */
  partnerName?: string;
  /** User's choice (not displayed, just for context) */
  myChoice: WYRChoice;
}

/**
 * Waiting phase component for Would You Rather
 *
 * Displayed after the current user has voted, while waiting
 * for their partner to vote. The user's choice is NOT shown
 * to maintain anticipation for the reveal.
 *
 * Per 03-CONTEXT.md: "Waiting screen keeps anticipation without revealing anything"
 */
export function WaitingPhase({ partnerName = 'Partner' }: WaitingPhaseProps) {
  return (
    <div className="wyr-waiting">
      <motion.div
        className="wyr-waiting__content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span
          className="wyr-waiting__message"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {STRINGS.WYR_WAITING(partnerName)}
        </motion.span>
      </motion.div>
    </div>
  );
}
