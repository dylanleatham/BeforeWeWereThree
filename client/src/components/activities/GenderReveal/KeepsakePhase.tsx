import { motion } from 'motion/react';
import type { GenderValue } from 'shared';
import { STRINGS } from '../../../constants/strings';
import './KeepsakePhase.css';

interface KeepsakePhaseProps {
  /** The revealed gender */
  gender: GenderValue;
}

/**
 * Static keepsake view after the ceremony
 *
 * This is the permanent view when revisiting the envelope.
 * Designed to be screenshot-worthy: beautiful typography,
 * warm color theme, and the gender result with a heartfelt message.
 *
 * The ceremony animation never replays; this static view is the
 * lasting memory of the moment.
 */
export function KeepsakePhase({ gender }: KeepsakePhaseProps) {
  const themeClass = gender === 'boy' ? 'keepsake--boy' : 'keepsake--girl';
  const revealText =
    gender === 'boy' ? STRINGS.REVEAL_BOY_TEXT : STRINGS.REVEAL_GIRL_TEXT;

  // Format the current date nicely
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      className={`keepsake ${themeClass}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Soft background wash */}
      <div className="keepsake__wash" aria-hidden="true" />

      {/* Content */}
      <div className="keepsake__content">
        <motion.h1
          className="keepsake__text"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {revealText}
        </motion.h1>

        <motion.p
          className="keepsake__message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {STRINGS.REVEAL_KEEPSAKE_MESSAGE}
        </motion.p>

        <motion.p
          className="keepsake__date"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {STRINGS.REVEAL_KEEPSAKE_DATE(dateStr)}
        </motion.p>
      </div>
    </motion.div>
  );
}
