import { useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion, useMotionValue, useTransform } from 'motion/react';
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
 * Displays a swipeable card that the user can drag left or right
 * to select their choice. The options are revealed behind the card
 * as the user drags.
 *
 * Swipe thresholds and velocity detection are used to determine
 * when a vote is registered. Once past threshold, the vote is final
 * (no take-backs).
 */
export function VotingPhase({
  optionA,
  optionB,
  onVote,
  showHint,
}: VotingPhaseProps) {
  const [dragX, setDragX] = useState(0);
  const x = useMotionValue(0);

  // Transform x position to highlight opacity for each option
  // As card moves left, option A (left) becomes more visible
  // As card moves right, option B (right) becomes more visible
  const leftHighlight = useTransform(x, [-150, 0], [1, 0]);
  const rightHighlight = useTransform(x, [0, 150], [0, 1]);

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], velocity: [vx] }) => {
      if (active) {
        setDragX(mx);
        x.set(mx);
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
          x.set(0);
        }
      }
    },
    { axis: 'x', filterTaps: true }
  );

  return (
    <div className="wyr-voting">
      {/* Background options layer */}
      <div className="wyr-voting__options">
        <motion.div
          className="wyr-voting__option wyr-voting__option--left"
          style={{ opacity: leftHighlight }}
        >
          <span className="wyr-voting__option-text">{optionA}</span>
        </motion.div>
        <motion.div
          className="wyr-voting__option wyr-voting__option--right"
          style={{ opacity: rightHighlight }}
        >
          <span className="wyr-voting__option-text">{optionB}</span>
        </motion.div>
      </div>

      {/* Draggable card - bind to regular div, animate inner motion.div */}
      <div className="wyr-voting__card-container" {...bind()}>
        <motion.div
          className="wyr-voting__card"
          animate={{ x: dragX }}
          transition={{
            type: 'spring',
            stiffness: WYR_CARD_SPRING.stiffness,
            damping: WYR_CARD_SPRING.damping,
          }}
        >
          <span className="wyr-voting__prompt">{STRINGS.WYR_SWIPE_PROMPT}</span>
          {showHint && (
            <span className="wyr-voting__hint">{STRINGS.WYR_SWIPE_HINT}</span>
          )}
        </motion.div>
      </div>

    </div>
  );
}
