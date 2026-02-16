import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import {
  NAME_GAME_GENERATING_PULSE_DURATION_S,
  PULSE_OPACITY_RANGE,
} from '../../../constants/animation';
import './GeneratingPhase.css';

interface GeneratingPhaseProps {
  /** Optional guidance text the user provided for this round */
  guidance?: string;
}

/**
 * Loading state shown while AI generates baby names.
 *
 * Displays a warm pulsing message rather than a spinner,
 * consistent with the "Golden Hour Intimacy" aesthetic.
 * Optionally shows the user's guidance text if provided.
 */
export function GeneratingPhase({ guidance }: GeneratingPhaseProps) {
  return (
    <div className="ng-generating">
      <motion.div
        className="ng-generating__content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span
          className="ng-generating__message"
          animate={{ opacity: PULSE_OPACITY_RANGE as unknown as number[] }}
          transition={{
            duration: NAME_GAME_GENERATING_PULSE_DURATION_S,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {STRINGS.NAME_GAME_GENERATING}
        </motion.span>

        {guidance && (
          <motion.p
            className="ng-generating__guidance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            &ldquo;{guidance}&rdquo;
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
