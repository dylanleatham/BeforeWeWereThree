import { motion } from 'motion/react';
import clsx from 'clsx';
import type { TriviaQuestion } from 'shared';
import { Button } from '../../common/Button';
import { STRINGS } from '../../../constants/strings';
import './QuestionPhase.css';

interface QuestionPhaseProps {
  /** The current trivia question */
  question: TriviaQuestion;
  /** Index of the currently selected option (null if none) */
  selectedIndex: number | null;
  /** Callback when user selects an option */
  onSelect: (index: number) => void;
  /** Callback when user submits their answer */
  onSubmit: () => void;
  /** Whether the answer is being submitted */
  isSubmitting: boolean;
}

/**
 * Question phase for Trivia activity
 *
 * Shows the question text with multiple choice options in a vertical list.
 * User selects an option then clicks Submit. No going back.
 */
export function QuestionPhase({
  question,
  selectedIndex,
  onSelect,
  onSubmit,
  isSubmitting,
}: QuestionPhaseProps) {
  return (
    <div className="trivia-question">
      <h3 className="trivia-question__text">{question.questionText}</h3>

      <div
        className="trivia-question__options"
        role="group"
        aria-label="Answer options"
      >
        {question.options.map((option, index) => (
          <motion.button
            key={index}
            type="button"
            className={clsx(
              'trivia-question__option',
              selectedIndex === index && 'trivia-question__option--selected'
            )}
            onClick={() => onSelect(index)}
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting}
            aria-pressed={selectedIndex === index}
          >
            <span className="trivia-question__option-letter">
              {STRINGS.TRIVIA_OPTION_LABEL(String.fromCharCode(65 + index))}
            </span>
            <span className="trivia-question__option-text">{option.text}</span>
          </motion.button>
        ))}
      </div>

      <Button
        variant="primary"
        onClick={onSubmit}
        disabled={selectedIndex === null || isSubmitting}
        className="trivia-question__submit"
      >
        {STRINGS.TRIVIA_SUBMIT_BUTTON}
      </Button>
    </div>
  );
}
