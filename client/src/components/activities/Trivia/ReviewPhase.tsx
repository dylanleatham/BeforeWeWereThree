import { motion } from 'motion/react';
import clsx from 'clsx';
import type { TriviaQuestionState } from 'shared';
import { STRINGS } from '../../../constants/strings';
import { TRIVIA_REVIEW_ITEM_STAGGER_S } from '../../../constants/animation';
import './ReviewPhase.css';

interface ReviewPhaseProps {
  /** All question states with answers */
  questions: TriviaQuestionState[];
  /** Called when user wants to close the review */
  onClose: () => void;
}

/**
 * Review phase for Trivia activity
 *
 * Read-only scrollable list of all questions with answers shown.
 * Displayed when reopening a completed trivia envelope.
 * Follows the WYR SummaryPhase pattern.
 */
export function ReviewPhase({ questions, onClose }: ReviewPhaseProps) {
  return (
    <div className="trivia-review">
      <h3 className="trivia-review__title">{STRINGS.TRIVIA_REVIEW_TITLE}</h3>

      <div className="trivia-review__list">
        {questions.map((qs, i) => {
          const correctIndex = qs.question.options.findIndex((o) => o.isCorrect);

          return (
            <motion.div
              key={qs.question.id}
              className={clsx(
                'trivia-review__item',
                qs.isCorrect && 'trivia-review__item--correct'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: i * TRIVIA_REVIEW_ITEM_STAGGER_S,
                ease: 'easeOut',
              }}
            >
              {/* Question text */}
              <p className="trivia-review__question-text">
                {qs.question.questionText}
              </p>

              {/* Options with answer indicators */}
              <div className="trivia-review__options">
                {qs.question.options.map((option, optIdx) => {
                  const isCorrectOption = optIdx === correctIndex;
                  const isUserAnswer = optIdx === qs.selectedIndex;
                  const isWrongAnswer = isUserAnswer && !isCorrectOption;

                  return (
                    <div
                      key={optIdx}
                      className={clsx(
                        'trivia-review__option',
                        isCorrectOption && 'trivia-review__option--correct',
                        isWrongAnswer && 'trivia-review__option--wrong',
                        !isUserAnswer && !isCorrectOption && 'trivia-review__option--dimmed'
                      )}
                    >
                      <span className="trivia-review__option-letter">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="trivia-review__option-text">
                        {option.text}
                      </span>
                      {isCorrectOption && (
                        <span className="trivia-review__badge trivia-review__badge--correct">
                          {'\u2713'}
                        </span>
                      )}
                      {isWrongAnswer && (
                        <span className="trivia-review__badge trivia-review__badge--wrong">
                          {'\u2717'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {qs.question.explanation && (
                <div className="trivia-review__explanation">
                  <span className="trivia-review__did-you-know">
                    {STRINGS.TRIVIA_DID_YOU_KNOW}
                  </span>
                  <p className="trivia-review__explanation-text">
                    {qs.question.explanation}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.button
        type="button"
        className="trivia-review__close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.3,
          delay: questions.length * TRIVIA_REVIEW_ITEM_STAGGER_S + 0.2,
        }}
      >
        {STRINGS.TRIVIA_REVIEW_CLOSE}
      </motion.button>
    </div>
  );
}
