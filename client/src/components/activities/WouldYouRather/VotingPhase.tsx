import { useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion } from 'motion/react';
import type { WYRChoice } from 'shared';
import { STRINGS } from '../../../constants/strings';
import {
  WYR_SWIPE_THRESHOLD_PX,
  WYR_SWIPE_VELOCITY,
  WYR_CARD_SPRING,
} from '../../../constants/animation';
import './VotingPhase.css';

interface VotingPhaseProps {
  /** Text for option A (left swipe) */
  optionA: string;
  /** Text for option B (right swipe) */
  optionB: string;
  /** Callback when user makes a choice */
  onVote: (choice: WYRChoice) => void;
  /** Show swipe hint for first-time users */
  showHint: boolean;
}

/**
 * Voting phase component for Would You Rather
 *
 * Shows both options upfront so users can read them before choosing.
 * Swipe left for Option A, right for Option B.
 * Options highlight as user drags to indicate their pending choice.
 */
export function VotingPhase({
  optionA,
  optionB,
  onVote,
  showHint,
}: VotingPhaseProps) {
  const [dragX, setDragX] = useState(0);
  const [pendingChoice, setPendingChoice] = useState<'A' | 'B' | null>(null);

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], velocity: [vx] }) => {
      if (active) {
        setDragX(mx);
        // Show pending choice based on drag direction
        if (mx < -30) {
          setPendingChoice('A');
        } else if (mx > 30) {
          setPendingChoice('B');
        } else {
          setPendingChoice(null);
        }
      } else {
        const passedThreshold = Math.abs(mx) > WYR_SWIPE_THRESHOLD_PX;
        const fastSwipe = vx > WYR_SWIPE_VELOCITY;

        if (passedThreshold || fastSwipe) {
          // Left swipe (negative x) = option_a
          // Right swipe (positive x) = option_b
          const choice: WYRChoice = dx < 0 ? 'option_a' : 'option_b';
          onVote(choice);
        } else {
          // Snap back to center
          setDragX(0);
          setPendingChoice(null);
        }
      }
    },
    { axis: 'x', filterTaps: true }
  );

  return (
    <div className="wyr-voting">
      {/* Header */}
      <h3 className="wyr-voting__title">{STRINGS.WYR_TITLE}</h3>

      {/* Options displayed upfront - always visible */}
      <div className="wyr-voting__choices">
        <div
          className={`wyr-voting__choice wyr-voting__choice--a ${
            pendingChoice === 'A' ? 'wyr-voting__choice--selected' : ''
          }`}
        >
          <span className="wyr-voting__choice-label">{STRINGS.WYR_OPTION_A_LABEL}</span>
          <p className="wyr-voting__choice-text">{optionA}</p>
        </div>

        <span className="wyr-voting__or">{STRINGS.WYR_OR}</span>

        <div
          className={`wyr-voting__choice wyr-voting__choice--b ${
            pendingChoice === 'B' ? 'wyr-voting__choice--selected' : ''
          }`}
        >
          <span className="wyr-voting__choice-label">{STRINGS.WYR_OPTION_B_LABEL}</span>
          <p className="wyr-voting__choice-text">{optionB}</p>
        </div>
      </div>

      {/* Swipe indicator */}
      <div className="wyr-voting__swipe-area" {...bind()}>
        <motion.div
          className="wyr-voting__swipe-handle"
          animate={{ x: dragX }}
          transition={{
            type: 'spring',
            stiffness: WYR_CARD_SPRING.stiffness,
            damping: WYR_CARD_SPRING.damping,
          }}
        >
          <span className="wyr-voting__swipe-text">
            {pendingChoice === 'A'
              ? STRINGS.WYR_CHOOSING_A
              : pendingChoice === 'B'
                ? STRINGS.WYR_CHOOSING_B
                : STRINGS.WYR_SWIPE_PROMPT}
          </span>
        </motion.div>
        {showHint && !pendingChoice && (
          <span className="wyr-voting__hint">{STRINGS.WYR_SWIPE_HINT}</span>
        )}
      </div>
    </div>
  );
}
