import { motion } from 'motion/react';
import type { WYRChoice } from 'shared';
import { STRINGS } from '../../../constants/strings';
import './VotingPhase.css';

interface VotingPhaseProps {
  /** Text for option A */
  optionA: string;
  /** Text for option B */
  optionB: string;
  /** Callback when user makes a choice */
  onVote: (choice: WYRChoice) => void;
}

/**
 * Voting phase component for Would You Rather
 *
 * Shows both options upfront so users can read them before choosing.
 * Tap an option to select it.
 */
export function VotingPhase({
  optionA,
  optionB,
  onVote,
}: VotingPhaseProps) {
  return (
    <div className="wyr-voting">
      {/* Header */}
      <h3 className="wyr-voting__title">{STRINGS.WYR_TITLE}</h3>

      {/* Options displayed upfront - tap to select */}
      <div className="wyr-voting__choices">
        <motion.button
          type="button"
          className="wyr-voting__choice wyr-voting__choice--a"
          onClick={() => onVote('option_a')}
          whileTap={{ scale: 0.97 }}
        >
          <span className="wyr-voting__choice-label">{STRINGS.WYR_OPTION_A_LABEL}</span>
          <p className="wyr-voting__choice-text">{optionA}</p>
        </motion.button>

        <span className="wyr-voting__or">{STRINGS.WYR_OR}</span>

        <motion.button
          type="button"
          className="wyr-voting__choice wyr-voting__choice--b"
          onClick={() => onVote('option_b')}
          whileTap={{ scale: 0.97 }}
        >
          <span className="wyr-voting__choice-label">{STRINGS.WYR_OPTION_B_LABEL}</span>
          <p className="wyr-voting__choice-text">{optionB}</p>
        </motion.button>
      </div>
    </div>
  );
}
