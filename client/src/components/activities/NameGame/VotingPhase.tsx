import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import type { NameVoteState, NameVoteChoice } from 'shared';
import { STRINGS } from '../../../constants/strings';
import { SWIPE_THRESHOLD_PX, FAST_SWIPE_VELOCITY, FAST_SWIPE_MIN_DISTANCE_PX } from '../../../constants/config';
import {
  NAME_CARD_EXIT_DURATION_S,
  NAME_CARD_SPRING_STIFFNESS,
  NAME_CARD_SPRING_DAMPING,
} from '../../../constants/animation';
import { NameCard } from './NameCard';
import './VotingPhase.css';

interface VotingPhaseProps {
  /** All names in the current round with vote state */
  names: NameVoteState[];
  /** Index of the current name being voted on */
  currentIndex: number;
  /** Callback when user votes on the current name */
  onVote: (choice: NameVoteChoice) => void;
  /** Total number of names in the round */
  totalNames: number;
}

/**
 * Voting phase with swipeable name cards.
 *
 * Gesture detection:
 * - Right swipe: Love
 * - Left swipe: Nope
 * - Down swipe: Maybe
 *
 * Uses useDrag on wrapper div, motion.div for animation
 * (never apply useDrag bind() directly to motion.div - type conflict).
 */
export function VotingPhase({
  names,
  currentIndex,
  onVote,
  totalNames,
}: VotingPhaseProps) {
  const [dragState, setDragState] = useState({ x: 0, y: 0 });
  const [exitDirection, setExitDirection] = useState<{ x: number; y: number } | null>(null);

  const currentName = names[currentIndex]?.name;

  const handleVote = useCallback(
    (choice: NameVoteChoice, dirX: number, dirY: number) => {
      // Set exit direction for fly-off animation
      setExitDirection({ x: dirX, y: dirY });

      // Small delay to let exit animation start before calling onVote
      setTimeout(() => {
        setExitDirection(null);
        setDragState({ x: 0, y: 0 });
        onVote(choice);
      }, NAME_CARD_EXIT_DURATION_S * 1000);
    },
    [onVote]
  );

  const bind = useDrag(
    ({ active, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], cancel }) => {
      if (!active) {
        // Gesture ended — check thresholds
        const absX = Math.abs(mx);
        const absY = Math.abs(my);
        const isHorizontal = absX > absY;

        if (isHorizontal) {
          // Horizontal swipe
          const fastSwipe = vx > FAST_SWIPE_VELOCITY && absX > FAST_SWIPE_MIN_DISTANCE_PX;
          if (mx > SWIPE_THRESHOLD_PX || (fastSwipe && dx > 0)) {
            handleVote('love', 500, 0);
            cancel();
            return;
          }
          if (mx < -SWIPE_THRESHOLD_PX || (fastSwipe && dx < 0)) {
            handleVote('nope', -500, 0);
            cancel();
            return;
          }
        } else {
          // Vertical swipe
          const fastSwipe = vy > FAST_SWIPE_VELOCITY && absY > FAST_SWIPE_MIN_DISTANCE_PX;
          if (my > SWIPE_THRESHOLD_PX || (fastSwipe && dy > 0)) {
            handleVote('maybe', 0, 500);
            cancel();
            return;
          }
        }

        // Not enough to trigger — spring back
        setDragState({ x: 0, y: 0 });
        return;
      }

      // While dragging — update visual state
      setDragState({ x: mx, y: my });
    },
    { filterTaps: true }
  );

  if (!currentName) {
    return null;
  }

  // Rotation follows horizontal drag (-15 to 15 degrees)
  const rotation = dragState.x * 0.05;

  return (
    <div className="ng-voting">
      {/* Progress indicator */}
      <div className="ng-voting__progress">
        <span className="ng-voting__progress-text">
          {STRINGS.NAME_GAME_PROGRESS(currentIndex + 1, totalNames)}
        </span>
        <div className="ng-voting__progress-bar">
          <div
            className="ng-voting__progress-fill"
            style={{ width: `${((currentIndex + 1) / totalNames) * 100}%` }}
          />
        </div>
      </div>

      {/* Card area */}
      <div className="ng-voting__card-area">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentName.id}
            className="ng-voting__card-wrapper"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={
              exitDirection
                ? {
                    x: exitDirection.x,
                    y: exitDirection.y,
                    opacity: 0,
                    rotate: exitDirection.x * 0.05,
                  }
                : {
                    x: dragState.x,
                    y: dragState.y,
                    opacity: 1,
                    scale: 1,
                    rotate: rotation,
                  }
            }
            exit={{ opacity: 0, scale: 0.8 }}
            transition={
              exitDirection
                ? { duration: NAME_CARD_EXIT_DURATION_S, ease: 'easeOut' }
                : dragState.x !== 0 || dragState.y !== 0
                  ? { type: 'tween', duration: 0 }
                  : {
                      type: 'spring',
                      stiffness: NAME_CARD_SPRING_STIFFNESS,
                      damping: NAME_CARD_SPRING_DAMPING,
                    }
            }
          >
            {/* Gesture wrapper — useDrag goes here, NOT on motion.div */}
            <div {...bind()} className="ng-voting__gesture-target">
              <NameCard
                name={currentName}
                dragState={dragState}
                isActive={!exitDirection}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Vote label hints */}
      <div className="ng-voting__hints" aria-hidden="true">
        <span className="ng-voting__hint ng-voting__hint--nope">
          {STRINGS.NAME_GAME_VOTE_NOPE}
        </span>
        <span className="ng-voting__hint ng-voting__hint--maybe">
          {STRINGS.NAME_GAME_VOTE_MAYBE}
        </span>
        <span className="ng-voting__hint ng-voting__hint--love">
          {STRINGS.NAME_GAME_VOTE_LOVE}
        </span>
      </div>
    </div>
  );
}
