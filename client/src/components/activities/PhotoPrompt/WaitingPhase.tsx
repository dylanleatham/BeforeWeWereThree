import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import './WaitingPhase.css';

interface WaitingPhaseProps {
  photoUrl: string;
  partnerName?: string;
}

/**
 * Waiting phase: shows the uploaded photo thumbnail with a waiting message.
 */
export function WaitingPhase({ photoUrl, partnerName = 'Partner' }: WaitingPhaseProps) {
  return (
    <div className="photo-prompt-waiting">
      <motion.div
        className="photo-prompt-waiting__content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Icon */}
        <motion.div
          className="photo-prompt-waiting__icon"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          aria-hidden="true"
        >
          {STRINGS.PHOTO_PROMPT_COMPLETE_ICON}
        </motion.div>

        {/* Title */}
        <h3 className="photo-prompt-waiting__title">{STRINGS.PHOTO_PROMPT_WAITING_TITLE}</h3>

        {/* Thumbnail */}
        <div className="photo-prompt-waiting__thumbnail">
          <img
            src={photoUrl}
            alt="Your uploaded photo"
            className="photo-prompt-waiting__image"
          />
        </div>

        {/* Waiting message */}
        <motion.p
          className="photo-prompt-waiting__message"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {STRINGS.PHOTO_PROMPT_WAITING_MESSAGE(partnerName)}
        </motion.p>
      </motion.div>
    </div>
  );
}
