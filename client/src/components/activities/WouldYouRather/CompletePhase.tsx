import { motion } from 'motion/react';
import type { WYRPromptState } from 'shared';
import { STRINGS } from '../../../constants/strings';
import './CompletePhase.css';

interface CompletePhaseProps {
  /** All prompt states for computing match statistics */
  prompts: WYRPromptState[];
  /** Called when user wants to close the activity */
  onClose: () => void;
}

/**
 * Complete phase component for Would You Rather
 *
 * Shows a warm completion message before returning to the envelope pile.
 * For multi-prompt envelopes, shows match statistics.
 */
export function CompletePhase({ prompts, onClose }: CompletePhaseProps) {
  const totalCount = prompts.length;
  const matchCount = prompts.filter((ps) => ps.results?.isMatch).length;
  const isMultiPrompt = totalCount > 1;
  const allMatch = matchCount === totalCount;

  // For single prompts, use the original isMatch behavior
  const isMatch = isMultiPrompt ? allMatch : (prompts[0]?.results?.isMatch ?? false);

  return (
    <div className="wyr-complete">
      <motion.div
        className="wyr-complete__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <span className="wyr-complete__icon" aria-hidden="true">
          {isMatch ? STRINGS.WYR_COMPLETE_ICON_MATCH : STRINGS.WYR_COMPLETE_ICON}
        </span>
        <h3 className="wyr-complete__title">{STRINGS.WYR_COMPLETE_TITLE}</h3>
        <p className="wyr-complete__message">
          {isMultiPrompt
            ? STRINGS.WYR_COMPLETE_MULTI_MESSAGE(matchCount, totalCount)
            : isMatch
              ? STRINGS.WYR_COMPLETE_MESSAGE_MATCH
              : STRINGS.WYR_COMPLETE_MESSAGE}
        </p>
      </motion.div>

      <motion.button
        className="wyr-complete__close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        {STRINGS.WYR_COMPLETE_CLOSE}
      </motion.button>
    </div>
  );
}
