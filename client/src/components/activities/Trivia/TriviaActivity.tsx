import { motion } from 'motion/react';
import { useTrivia } from '../../../hooks/useTrivia';
import { QuestionPhase } from './QuestionPhase';
import { RevealPhase } from './RevealPhase';
import { CompletePhase } from './CompletePhase';
import { ReviewPhase } from './ReviewPhase';
import { STRINGS } from '../../../constants/strings';
import './TriviaActivity.css';

interface TriviaActivityProps {
  /** Envelope ID for this activity */
  envelopeId: string;
  /** Callback when activity is complete (triggers envelope status update) */
  onComplete: () => void;
}

/**
 * Main Trivia activity component
 *
 * Orchestrates the full trivia experience:
 * 1. Loading state while fetching questions
 * 2. Per-question cycle: QuestionPhase -> RevealPhase
 * 3. CompletePhase with warm message
 * 4. ReviewPhase for reopened completed envelopes
 *
 * Solo activity -- no partner presence, no SignalR, no progress indicator
 * (per CONTEXT.md: "No question progress indicator -- questions just flow")
 */
export function TriviaActivity({
  envelopeId,
  onComplete,
}: TriviaActivityProps) {
  const {
    questions,
    currentQuestion,
    currentIndex,
    phase,
    selectedAnswer,
    isCorrect,
    correctIndex,
    explanation,
    isLoading,
    isSubmitting,
    error,
    isLastQuestion,
    selectOption,
    submitAnswer,
    advance,
    retry,
  } = useTrivia({ envelopeId });

  const handleClose = () => {
    onComplete();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="trivia-activity trivia-activity--loading">
        <motion.div
          className="trivia-activity__spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          aria-label="Loading activity"
        />
      </div>
    );
  }

  // Error state
  if (error && !currentQuestion) {
    return (
      <div className="trivia-activity trivia-activity--error">
        <p className="trivia-activity__error-message">
          {error}
        </p>
        <button className="trivia-activity__retry" onClick={retry}>
          {STRINGS.APP_RETRY}
        </button>
      </div>
    );
  }

  // Render phase content
  const renderPhase = () => {
    switch (phase) {
      case 'answering':
        if (!currentQuestion) return null;
        return (
          <QuestionPhase
            question={currentQuestion.question}
            selectedIndex={selectedAnswer}
            onSelect={selectOption}
            onSubmit={submitAnswer}
            isSubmitting={isSubmitting}
          />
        );

      case 'revealing':
        if (!currentQuestion || isCorrect === null || correctIndex === null) return null;
        return (
          <RevealPhase
            question={currentQuestion.question}
            selectedIndex={selectedAnswer!}
            correctIndex={correctIndex}
            isCorrect={isCorrect}
            explanation={explanation}
            onAdvance={advance}
            isLastQuestion={isLastQuestion}
          />
        );

      case 'complete':
        return (
          <CompletePhase onClose={handleClose} />
        );

      case 'review':
        return (
          <ReviewPhase
            questions={questions}
            onClose={handleClose}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="trivia-activity">
      {/* Phase content with smooth transitions */}
      <motion.div
        className="trivia-activity__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        key={`${phase}-${currentIndex}`}
      >
        {renderPhase()}
      </motion.div>

      {/* Error banner (non-blocking, e.g., submission error) */}
      {error && currentQuestion && (
        <div
          className="trivia-activity__error-banner"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
