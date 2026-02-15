import { motion } from 'motion/react';
import type { WYRResults, WYRChoice } from 'shared';
import { STRINGS } from '../../../constants/strings';
import {
  WYR_REVEAL_STAGGER_MS,
  WYR_REVEAL_DURATION_MS,
  WYR_MATCH_GLOW_DURATION_MS,
} from '../../../constants/animation';
import './RevealPhase.css';

interface RevealPhaseProps {
  /** Text for option A */
  optionA: string;
  /** Text for option B */
  optionB: string;
  /** Voting results */
  results: WYRResults;
  /** Called when user wants to advance to next prompt or finish */
  onAdvance: () => void;
  /** Whether this is the last prompt in a multi-prompt envelope */
  isLastPrompt?: boolean;
}

/**
 * Get the actual option text based on choice
 */
function getChoiceText(choice: WYRChoice, optionA: string, optionB: string): string {
  return choice === 'option_a' ? optionA : optionB;
}

/**
 * Reveal phase component for Would You Rather
 *
 * Shows both choices side by side with staggered animation.
 * Celebrates matches with a glow effect (not confetti - per 03-CONTEXT.md:
 * "Match celebration should be noticeable but not over-the-top").
 *
 * User advances manually via "Next" button to allow time for discussion.
 */
export function RevealPhase({
  optionA,
  optionB,
  results,
  onAdvance,
  isLastPrompt = false,
}: RevealPhaseProps) {
  const myChoiceText = getChoiceText(results.myChoice, optionA, optionB);
  const partnerChoiceText = getChoiceText(results.partnerChoice, optionA, optionB);

  return (
    <div className={`wyr-reveal ${results.isMatch ? 'wyr-reveal--match' : ''}`}>
      <div className="wyr-reveal__choices">
        {/* My choice */}
        <motion.div
          className="wyr-reveal__choice wyr-reveal__choice--mine"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: WYR_REVEAL_DURATION_MS / 1000,
            ease: 'easeOut',
          }}
        >
          <span className="wyr-reveal__label">{STRINGS.WYR_YOUR_CHOICE}</span>
          <span className="wyr-reveal__text">{myChoiceText}</span>
        </motion.div>

        {/* Partner choice */}
        <motion.div
          className="wyr-reveal__choice wyr-reveal__choice--partner"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: WYR_REVEAL_DURATION_MS / 1000,
            delay: WYR_REVEAL_STAGGER_MS / 1000,
            ease: 'easeOut',
          }}
        >
          <span className="wyr-reveal__label">{STRINGS.WYR_PARTNER_CHOICE}</span>
          <span className="wyr-reveal__text">{partnerChoiceText}</span>
        </motion.div>
      </div>

      {/* Match celebration */}
      {results.isMatch && (
        <motion.div
          className="wyr-reveal__match"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: (WYR_REVEAL_STAGGER_MS + WYR_REVEAL_DURATION_MS) / 1000,
          }}
        >
          <motion.span
            className="wyr-reveal__match-text"
            animate={{
              textShadow: [
                '0 0 0px var(--color-sunrise-gold)',
                '0 0 20px var(--color-sunrise-gold)',
                '0 0 0px var(--color-sunrise-gold)',
              ],
            }}
            transition={{
              duration: WYR_MATCH_GLOW_DURATION_MS / 1000,
              repeat: 2,
              ease: 'easeInOut',
            }}
          >
            {STRINGS.WYR_MATCH}
          </motion.span>
        </motion.div>
      )}

      {/* Advance button */}
      <motion.button
        className="wyr-reveal__advance"
        onClick={onAdvance}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.3,
          delay: (WYR_REVEAL_STAGGER_MS + WYR_REVEAL_DURATION_MS + 200) / 1000,
        }}
      >
        {isLastPrompt ? STRINGS.WYR_FINISH : STRINGS.WYR_NEXT}
      </motion.button>
    </div>
  );
}
