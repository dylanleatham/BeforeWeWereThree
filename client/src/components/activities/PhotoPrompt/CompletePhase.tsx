import { motion } from 'motion/react';
import type { PhotoPromptResponse } from 'shared';
import { STRINGS } from '../../../constants/strings';
import './CompletePhase.css';

interface CompletePhaseProps {
  promptText: string;
  myResponse: PhotoPromptResponse;
  partnerResponse: PhotoPromptResponse;
  onClose: () => void;
}

/**
 * Complete phase: keepsake view showing both photos side by side.
 */
export function CompletePhase({
  promptText,
  myResponse,
  partnerResponse,
  onClose,
}: CompletePhaseProps) {
  return (
    <div className="photo-prompt-complete">
      <motion.div
        className="photo-prompt-complete__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Glow animation */}
        <motion.div
          className="photo-prompt-complete__glow"
          animate={{
            boxShadow: [
              '0 0 0px var(--envelope-color-photo-prompt)',
              '0 0 40px rgba(var(--envelope-color-photo-prompt-rgb), 0.4)',
              '0 0 0px var(--envelope-color-photo-prompt)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: 2,
            ease: 'easeInOut',
          }}
        />

        {/* Icon */}
        <span className="photo-prompt-complete__icon" aria-hidden="true">
          {STRINGS.PHOTO_PROMPT_COMPLETE_ICON}
        </span>

        {/* Title */}
        <h3 className="photo-prompt-complete__title">{STRINGS.PHOTO_PROMPT_COMPLETE_TITLE}</h3>

        {/* Prompt text */}
        <p className="photo-prompt-complete__prompt">{promptText}</p>

        {/* Photos side by side */}
        <div className="photo-prompt-complete__photos">
          <div className="photo-prompt-complete__photo-card">
            <img
              src={myResponse.photoUrl}
              alt="Your photo"
              className="photo-prompt-complete__image"
            />
            <span className="photo-prompt-complete__label">
              {STRINGS.PHOTO_PROMPT_YOURS}
            </span>
          </div>
          <div className="photo-prompt-complete__photo-card">
            <img
              src={partnerResponse.photoUrl}
              alt="Partner's photo"
              className="photo-prompt-complete__image"
            />
            <span className="photo-prompt-complete__label">
              {STRINGS.PHOTO_PROMPT_PARTNERS}
            </span>
          </div>
        </div>

        {/* Message */}
        <p className="photo-prompt-complete__message">{STRINGS.PHOTO_PROMPT_COMPLETE_MESSAGE}</p>
      </motion.div>

      {/* Close button */}
      <motion.button
        type="button"
        className="photo-prompt-complete__close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        {STRINGS.PHOTO_PROMPT_CLOSE}
      </motion.button>
    </div>
  );
}
