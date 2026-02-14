import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Letter } from 'shared';
import { STRINGS } from '../../../constants/strings';
import {
  WYR_REVEAL_STAGGER_MS,
  WYR_REVEAL_DURATION_MS,
  MODAL_ENTER_SCALE,
} from '../../../constants/animation';
import './RevealPhase.css';

/** Max characters shown in the button preview */
const PREVIEW_LENGTH = 60;

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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '\u2026';
}

/**
 * Reveal phase component for Letter to Baby
 *
 * Shows two tappable buttons (one per letter) with a short content preview.
 * Tapping a button opens a fullscreen overlay for comfortable reading.
 * User advances manually via Continue button.
 */
export function RevealPhase({
  myLetter,
  partnerLetter,
  partnerName = 'Partner',
  onAdvance,
}: RevealPhaseProps) {
  const [selectedLetter, setSelectedLetter] = useState<'mine' | 'partner' | null>(null);

  const activeLetter = selectedLetter === 'mine' ? myLetter : partnerLetter;
  const activeLabel =
    selectedLetter === 'mine'
      ? STRINGS.LETTER_YOURS
      : STRINGS.LETTER_PARTNERS(partnerName);

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

      {/* Letter buttons */}
      <div className="letter-reveal__buttons">
        {/* My letter button */}
        <motion.button
          className="letter-reveal__card"
          onClick={() => setSelectedLetter('mine')}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: WYR_REVEAL_DURATION_MS / 1000,
            ease: 'easeOut',
          }}
        >
          <span className="letter-reveal__label">{STRINGS.LETTER_YOURS}</span>
          <span className="letter-reveal__preview">
            {truncate(myLetter.content, PREVIEW_LENGTH)}
          </span>
          <span className="letter-reveal__read-cta">{STRINGS.LETTER_READ_YOURS}</span>
        </motion.button>

        {/* Partner's letter button */}
        <motion.button
          className="letter-reveal__card"
          onClick={() => setSelectedLetter('partner')}
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
          <span className="letter-reveal__preview">
            {truncate(partnerLetter.content, PREVIEW_LENGTH)}
          </span>
          <span className="letter-reveal__read-cta">
            {STRINGS.LETTER_READ_PARTNERS(partnerName)}
          </span>
        </motion.button>
      </div>

      {/* Continue button — only visible when overlay is closed */}
      {selectedLetter === null && (
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
      )}

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {selectedLetter !== null && (
          <motion.div
            className="letter-reveal__overlay"
            initial={{ opacity: 0, scale: MODAL_ENTER_SCALE }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: MODAL_ENTER_SCALE }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="letter-reveal__overlay-header">
              <span className="letter-reveal__overlay-label">{activeLabel}</span>
              <button
                className="letter-reveal__overlay-close"
                onClick={() => setSelectedLetter(null)}
                aria-label={STRINGS.LETTER_CLOSE_DETAIL}
              >
                {STRINGS.LETTER_CLOSE_DETAIL}
              </button>
            </div>

            <div className="letter-reveal__overlay-body">
              <p className="letter-reveal__overlay-text">{activeLetter.content}</p>

              {activeLetter.photoUrl && (
                <div className="letter-reveal__overlay-photo">
                  <img
                    src={activeLetter.photoUrl}
                    alt={
                      selectedLetter === 'mine'
                        ? 'Your attached photo'
                        : `${partnerName}'s attached photo`
                    }
                    className="letter-reveal__overlay-photo-image"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
