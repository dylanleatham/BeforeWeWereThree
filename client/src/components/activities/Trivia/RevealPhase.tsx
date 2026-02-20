import { motion } from 'motion/react';
import clsx from 'clsx';
import type { TriviaQuestion } from 'shared';
import { STRINGS } from '../../../constants/strings';
import {
  TRIVIA_SUSPENSE_DURATION_MS,
  TRIVIA_REVEAL_DURATION_MS,
  TRIVIA_EXPLANATION_DELAY_MS,
  TRIVIA_ADVANCE_BUTTON_DELAY_MS,
} from '../../../constants/animation';
import './RevealPhase.css';

interface RevealPhaseProps {
  /** The trivia question being revealed */
  question: TriviaQuestion;
  /** Index of the user's selected answer */
  selectedIndex: number;
  /** Index of the correct answer */
  correctIndex: number;
  /** Whether the user's answer was correct */
  isCorrect: boolean;
  /** Optional explanation text */
  explanation: string | null;
  /** Callback to advance to next question or complete */
  onAdvance: () => void;
  /** Whether this is the last question */
  isLastQuestion: boolean;
}

/**
 * Reveal phase for Trivia activity
 *
 * Shows a suspense animation on the selected option, then reveals
 * correct/incorrect with visual indicators. Optional explanation
 * fades in after the reveal. Advance button appears last.
 */
export function RevealPhase({
  question,
  selectedIndex,
  correctIndex,
  isCorrect,
  explanation,
  onAdvance,
  isLastQuestion,
}: RevealPhaseProps) {
  const suspenseDelay = TRIVIA_SUSPENSE_DURATION_MS / 1000;
  const revealDuration = TRIVIA_REVEAL_DURATION_MS / 1000;
  const explanationDelay = (TRIVIA_SUSPENSE_DURATION_MS + TRIVIA_EXPLANATION_DELAY_MS) / 1000;
  const buttonDelay = (TRIVIA_SUSPENSE_DURATION_MS + TRIVIA_ADVANCE_BUTTON_DELAY_MS) / 1000;

  return (
    <div className="trivia-reveal">
      {/* Question text */}
      <h3 className="trivia-reveal__question">{question.questionText}</h3>

      {/* Options with reveal states */}
      <div className="trivia-reveal__options">
        {question.options.map((option, index) => {
          const isSelected = index === selectedIndex;
          const isCorrectOption = index === correctIndex;
          const isWrongSelection = isSelected && !isCorrectOption;

          return (
            <motion.div
              key={index}
              className={clsx(
                'trivia-reveal__option',
                isCorrectOption && 'trivia-reveal__option--correct',
                isWrongSelection && 'trivia-reveal__option--wrong',
                !isSelected && !isCorrectOption && 'trivia-reveal__option--dimmed',
                isSelected && 'trivia-reveal__option--selected'
              )}
              animate={
                isSelected
                  ? {
                      scale: [1, 1.02, 1, 1.02, 1],
                    }
                  : undefined
              }
              transition={
                isSelected
                  ? {
                      duration: suspenseDelay,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
            >
              <span className="trivia-reveal__option-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="trivia-reveal__option-text">{option.text}</span>
              {isCorrectOption && (
                <motion.span
                  className="trivia-reveal__check"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: suspenseDelay, duration: 0.3 }}
                  aria-label="Correct answer"
                >
                  \u2713
                </motion.span>
              )}
              {isWrongSelection && (
                <motion.span
                  className="trivia-reveal__cross"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: suspenseDelay, duration: 0.3 }}
                  aria-label="Incorrect answer"
                >
                  \u2717
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Result text */}
      <motion.div
        className={clsx(
          'trivia-reveal__result',
          isCorrect ? 'trivia-reveal__result--correct' : 'trivia-reveal__result--incorrect'
        )}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: revealDuration,
          delay: suspenseDelay,
          ease: 'easeOut',
        }}
      >
        {isCorrect ? STRINGS.TRIVIA_CORRECT : STRINGS.TRIVIA_INCORRECT}
      </motion.div>

      {/* Explanation */}
      {explanation && (
        <motion.div
          className="trivia-reveal__explanation"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: explanationDelay,
          }}
        >
          <p className="trivia-reveal__did-you-know">{STRINGS.TRIVIA_DID_YOU_KNOW}</p>
          <p className="trivia-reveal__explanation-text">{explanation}</p>
        </motion.div>
      )}

      {/* Advance button */}
      <motion.button
        className="trivia-reveal__advance"
        onClick={onAdvance}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.3,
          delay: buttonDelay,
        }}
      >
        {isLastQuestion ? STRINGS.TRIVIA_FINISH_BUTTON : STRINGS.TRIVIA_NEXT_BUTTON}
      </motion.button>
    </div>
  );
}
