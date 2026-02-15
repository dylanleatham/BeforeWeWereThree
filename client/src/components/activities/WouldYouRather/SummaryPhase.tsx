import { motion } from 'motion/react';
import type { WYRPromptState, WYRChoice } from 'shared';
import { STRINGS } from '../../../constants/strings';
import { WYR_SUMMARY_ITEM_STAGGER_S } from '../../../constants/animation';
import './SummaryPhase.css';

interface SummaryPhaseProps {
  /** All prompt states with results */
  prompts: WYRPromptState[];
  /** Called when user wants to close the summary */
  onClose: () => void;
}

/**
 * Get the actual option text based on choice
 */
function getChoiceText(choice: WYRChoice, optionA: string, optionB: string): string {
  return choice === 'option_a' ? optionA : optionB;
}

/**
 * Summary phase for reopened completed WYR envelopes
 *
 * Scrollable read-only list of all prompts with both participants' answers.
 * Shows prompt number, both choices, and match badges.
 */
export function SummaryPhase({ prompts, onClose }: SummaryPhaseProps) {
  return (
    <div className="wyr-summary">
      <h3 className="wyr-summary__title">{STRINGS.WYR_SUMMARY_TITLE}</h3>

      <div className="wyr-summary__list">
        {prompts.map((ps, i) => {
          const hasResults = ps.results !== null;
          const myChoiceText = hasResults
            ? getChoiceText(ps.results!.myChoice, ps.prompt.optionA, ps.prompt.optionB)
            : null;
          const partnerChoiceText = hasResults
            ? getChoiceText(ps.results!.partnerChoice, ps.prompt.optionA, ps.prompt.optionB)
            : null;

          return (
            <motion.div
              key={ps.prompt.id}
              className={`wyr-summary__item ${hasResults && ps.results!.isMatch ? 'wyr-summary__item--match' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: i * WYR_SUMMARY_ITEM_STAGGER_S,
                ease: 'easeOut',
              }}
            >
              <div className="wyr-summary__item-header">
                <span className="wyr-summary__item-number">{i + 1}</span>
                <span className="wyr-summary__item-options">
                  {ps.prompt.optionA} <span className="wyr-summary__vs">vs</span> {ps.prompt.optionB}
                </span>
              </div>

              {hasResults && (
                <div className="wyr-summary__item-choices">
                  <div className="wyr-summary__choice wyr-summary__choice--mine">
                    <span className="wyr-summary__choice-label">{STRINGS.WYR_YOUR_CHOICE}</span>
                    <span className="wyr-summary__choice-text">{myChoiceText}</span>
                  </div>
                  <div className="wyr-summary__choice wyr-summary__choice--partner">
                    <span className="wyr-summary__choice-label">{STRINGS.WYR_PARTNER_CHOICE}</span>
                    <span className="wyr-summary__choice-text">{partnerChoiceText}</span>
                  </div>
                  {ps.results!.isMatch && (
                    <span className="wyr-summary__match-badge">{STRINGS.WYR_MATCH}</span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.button
        className="wyr-summary__close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.3,
          delay: prompts.length * WYR_SUMMARY_ITEM_STAGGER_S + 0.2,
        }}
      >
        {STRINGS.WYR_COMPLETE_CLOSE}
      </motion.button>
    </div>
  );
}
