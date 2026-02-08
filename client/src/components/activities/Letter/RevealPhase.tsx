import { motion } from 'motion/react';
import type { Letter } from 'shared';
import { STRINGS } from '../../../constants/strings';
import {
  WYR_REVEAL_STAGGER_MS,
  WYR_REVEAL_DURATION_MS,
} from '../../../constants/animation';
import './RevealPhase.css';

interface RevealPhaseProps {
  /** User's submitted letter */
  myLetter: Letter;
  /** Partner's submitted letter */
  partnerLetter: Letter;
  /** Partner's name for display */
  partnerName?: string;
  /** Called when user wants to advance to complete */
  onAdvance: () => void;
}

/**
 * Reveal phase component for Letter to Baby
 *
 * Shows both letters side by side with staggered animation.
 * Each letter card displays:
 * - Header label (Yours / Partner's)
 * - Letter content styled as handwritten
 * - Photo thumbnail if attached
 *
 * User advances manually via Continue button.
 */
export function RevealPhase({
  myLetter,
  partnerLetter,
  partnerName = 'Partner',
  onAdvance,
}: RevealPhaseProps) {
  return (
    <div className="letter-reveal">
      {/* Title */}
      <motion.h3
        className="letter-reveal__title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {STRINGS.LETTER_REVEAL_TITLE}
      </motion.h3>

      {/* Letters container */}
      <div className="letter-reveal__letters">
        {/* My letter */}
        <motion.div
          className="letter-reveal__card"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: WYR_REVEAL_DURATION_MS / 1000,
            ease: 'easeOut',
          }}
        >
          <span className="letter-reveal__label">{STRINGS.LETTER_YOURS}</span>
          <div className="letter-reveal__content">
            <p className="letter-reveal__text">{myLetter.content}</p>
            {myLetter.photoUrl && (
              <div className="letter-reveal__photo">
                <img
                  src={myLetter.photoUrl}
                  alt="Your attached photo"
                  className="letter-reveal__photo-image"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Partner's letter */}
        <motion.div
          className="letter-reveal__card"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: WYR_REVEAL_DURATION_MS / 1000,
            delay: WYR_REVEAL_STAGGER_MS / 1000,
            ease: 'easeOut',
          }}
        >
          <span className="letter-reveal__label">
            {STRINGS.LETTER_PARTNERS(partnerName)}
          </span>
          <div className="letter-reveal__content">
            <p className="letter-reveal__text">{partnerLetter.content}</p>
            {partnerLetter.photoUrl && (
              <div className="letter-reveal__photo">
                <img
                  src={partnerLetter.photoUrl}
                  alt={`${partnerName}'s attached photo`}
                  className="letter-reveal__photo-image"
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Continue button */}
      <motion.button
        className="letter-reveal__advance"
        onClick={onAdvance}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.3,
          delay: (WYR_REVEAL_STAGGER_MS + WYR_REVEAL_DURATION_MS + 200) / 1000,
        }}
      >
        {STRINGS.WYR_NEXT}
      </motion.button>
    </div>
  );
}
