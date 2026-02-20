import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  TriviaPhase,
  TriviaQuestionState,
} from 'shared';
import { getTriviaState, submitTriviaAnswer } from '../services/api';
import { STRINGS } from '../constants/strings';

interface UseTriviaProps {
  /** Envelope ID to fetch trivia questions for */
  envelopeId: string;
}

interface UseTriviaReturn {
  /** All question states */
  questions: TriviaQuestionState[];
  /** Current question (derived from currentIndex) */
  currentQuestion: TriviaQuestionState | null;
  /** Current question index */
  currentIndex: number;
  /** Current phase of the activity */
  phase: TriviaPhase;
  /** Locally selected option index before submit (null if none selected) */
  selectedAnswer: number | null;
  /** Whether the submitted answer was correct (null before submit) */
  isCorrect: boolean | null;
  /** Correct answer index after submit (null before submit) */
  correctIndex: number | null;
  /** Explanation text after submit (null before submit or if no explanation) */
  explanation: string | null;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Whether answer submission is in progress */
  isSubmitting: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** Whether this is the last question */
  isLastQuestion: boolean;
  /** Select an option locally (before submitting) */
  selectOption: (index: number) => void;
  /** Submit the currently selected answer to the API */
  submitAnswer: () => Promise<void>;
  /** Advance to next question or complete phase */
  advance: () => void;
  /** Retry loading after error */
  retry: () => void;
}

/**
 * Hook for managing solo trivia activity state
 *
 * Handles:
 * - Initial data loading from API
 * - Phase state machine (answering -> revealing -> answering (next) -> ... -> complete)
 * - Local option selection before submission
 * - Answer submission with correctness reveal
 * - Review mode for reopened completed envelopes
 *
 * Key differences from useWouldYouRather:
 * - No SignalR connection/events (solo activity)
 * - No partner-related state
 * - No optimistic updates (server is source of truth for correctness)
 * - Local option selection before API submission
 */
export function useTrivia({
  envelopeId,
}: UseTriviaProps): UseTriviaReturn {
  // Question state
  const [questions, setQuestions] = useState<TriviaQuestionState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<TriviaPhase>('answering');

  // Per-question interaction state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mounted ref for async safety (per CLAUDE.md: set true in effect body)
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Derived
  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex === questions.length - 1;

  /**
   * Load trivia state from API
   */
  const loadState = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getTriviaState(envelopeId);

      if (!mountedRef.current) return;

      setQuestions(data.questions);
      setCurrentIndex(data.currentQuestionIndex);

      // Determine initial phase
      if (data.allComplete) {
        setPhase('review');
      } else {
        setPhase('answering');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Failed to load trivia state:', err);
      setError(STRINGS.TRIVIA_ERROR_LOADING);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [envelopeId]);

  // Load on mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  /**
   * Select an option locally (before submitting)
   */
  const selectOption = useCallback((index: number) => {
    if (phase !== 'answering') return;
    setSelectedAnswer(index);
  }, [phase]);

  /**
   * Submit the currently selected answer to the API
   */
  const submitAnswer = useCallback(async () => {
    if (selectedAnswer === null || !currentQuestion || phase !== 'answering') return;

    // Capture current values before async call (per CLAUDE.md lessons learned)
    const questionId = currentQuestion.question.id;
    const selected = selectedAnswer;
    const idx = currentIndex;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitTriviaAnswer(envelopeId, questionId, selected);

      if (!mountedRef.current) return;

      // Store reveal data
      setIsCorrect(response.isCorrect);
      setCorrectIndex(response.correctIndex);
      setExplanation(response.explanation);

      // Update question state to mark as answered
      setQuestions((prev) => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx]!,
          selectedIndex: selected,
          isCorrect: response.isCorrect,
          answered: true,
        };
        return updated;
      });

      // Transition to revealing phase
      setPhase('revealing');
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Failed to submit trivia answer:', err);
      setError(STRINGS.TRIVIA_ERROR_SUBMITTING);
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [selectedAnswer, currentQuestion, phase, envelopeId, currentIndex]);

  /**
   * Advance to the next question or complete phase
   */
  const advance = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      // Move to next question
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // Reset per-question state
      setSelectedAnswer(null);
      setIsCorrect(null);
      setCorrectIndex(null);
      setExplanation(null);

      setPhase('answering');
    } else {
      // Last question — go to complete phase
      setPhase('complete');
    }
  }, [currentIndex, questions.length]);

  /**
   * Retry loading after error
   */
  const retry = useCallback(() => {
    loadState();
  }, [loadState]);

  return {
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
  };
}
