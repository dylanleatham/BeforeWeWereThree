import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import './WaitingPhase.css';

interface WaitingPhaseProps {
  /** Name of the partner we're waiting for */
  partnerName?: string;
}

/**
 * Waiting phase component for Letter to Baby
 *
 * Displayed after the current user has submitted their letter,
 * while waiting for their partner to finish and submit.
 *
 * Shows a warm "Letter Sent!" message with gentle pulsing animation.
 */
export function WaitingPhase({ partnerName = 'Partner' }: WaitingPhaseProps) {
  return (
    <div className="letter-waiting">
      <motion.div
        className="letter-waiting__content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Envelope icon */}
        <motion.div
          className="letter-waiting__icon"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          aria-hidden="true"
        >
          {STRINGS.LETTER_COMPLETE_ICON}
        </motion.div>

        {/* Title */}
        <h3 className="letter-waiting__title">{STRINGS.LETTER_WAITING_TITLE}</h3>

        {/* Waiting message */}
        <motion.p
          className="letter-waiting__message"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {STRINGS.LETTER_WAITING_MESSAGE(partnerName)}
        </motion.p>
      </motion.div>
    </div>
  );
}
