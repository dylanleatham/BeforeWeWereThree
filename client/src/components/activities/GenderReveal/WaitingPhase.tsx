import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import {
  REVEAL_WAITING_PULSE_DURATION_MS,
} from '../../../constants/animation';
import './WaitingPhase.css';

interface WaitingPhaseProps {
  /** Number of keys validated so far */
  keysValidated: number;
}

/**
 * Glowing anticipation phase while waiting for partner's key
 *
 * After one participant enters their key, this shows a warm
 * pulsing glow that builds anticipation for the partner's entry.
 * The pulsing suggests something is alive and waiting.
 */
export function WaitingPhase({ keysValidated: _keysValidated }: WaitingPhaseProps) {
  const pulseDurationS = REVEAL_WAITING_PULSE_DURATION_MS / 1000;

  return (
    <div className="waiting-phase">
      {/* Pulsing background glow */}
      <motion.div
        className="waiting-phase__glow"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{
          duration: pulseDurationS,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <motion.div
        className="waiting-phase__content"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="waiting-phase__title">{STRINGS.REVEAL_WAITING_TITLE}</h2>
        <p className="waiting-phase__subtitle">{STRINGS.REVEAL_WAITING_SUBTITLE}</p>
      </motion.div>
    </div>
  );
}
