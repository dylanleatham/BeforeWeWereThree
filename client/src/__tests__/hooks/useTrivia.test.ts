/**
 * useTrivia hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { TriviaQuestionState, TriviaEnvelopeResponse, TriviaAnswerResponse } from 'shared';

vi.mock('../../services/api', () => ({
  getTriviaState: vi.fn(),
  submitTriviaAnswer: vi.fn(),
}));

vi.mock('../../constants/strings', () => ({
  STRINGS: {
    TRIVIA_ERROR_LOADING: 'Failed to load trivia',
    TRIVIA_ERROR_SUBMITTING: 'Failed to submit answer',
  },
}));

import { getTriviaState, submitTriviaAnswer } from '../../services/api';
import { useTrivia } from '../../hooks/useTrivia';

const mockGetTriviaState = vi.mocked(getTriviaState);
const mockSubmitTriviaAnswer = vi.mocked(submitTriviaAnswer);

const QUESTION_A: TriviaQuestionState = {
  question: {
    id: 'q1',
    questionText: 'What color?',
    options: [
      { text: 'Red', isCorrect: true },
      { text: 'Blue', isCorrect: false },
    ],
    explanation: 'Red is correct',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  selectedIndex: null,
  isCorrect: null,
  answered: false,
};

const QUESTION_B: TriviaQuestionState = {
  question: {
    id: 'q2',
    questionText: 'How many?',
    options: [
      { text: '1', isCorrect: false },
      { text: '2', isCorrect: true },
    ],
    explanation: 'Two',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  selectedIndex: null,
  isCorrect: null,
  answered: false,
};

function makeStateResponse(overrides?: Partial<TriviaEnvelopeResponse>): TriviaEnvelopeResponse {
  return {
    questions: [QUESTION_A, QUESTION_B],
    currentQuestionIndex: 0,
    allComplete: false,
    ...overrides,
  };
}

describe('useTrivia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with loading state', () => {
    mockGetTriviaState.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.questions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should load initial trivia state from API', async () => {
    mockGetTriviaState.mockResolvedValue(makeStateResponse());

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.questions).toHaveLength(2);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentQuestion).toEqual(QUESTION_A);
    expect(result.current.phase).toBe('answering');
    expect(mockGetTriviaState).toHaveBeenCalledWith('env-1');
  });

  it('should handle allComplete state as review phase', async () => {
    mockGetTriviaState.mockResolvedValue(
      makeStateResponse({
        allComplete: true,
        questions: [
          { ...QUESTION_A, selectedIndex: 0, isCorrect: true, answered: true },
          { ...QUESTION_B, selectedIndex: 1, isCorrect: true, answered: true },
        ],
      })
    );

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.phase).toBe('review');
  });

  it('should set selectedAnswer when selectOption is called', async () => {
    mockGetTriviaState.mockResolvedValue(makeStateResponse());

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectOption(1);
    });

    expect(result.current.selectedAnswer).toBe(1);
  });

  it('should ignore selectOption when not in answering phase', async () => {
    mockGetTriviaState.mockResolvedValue(makeStateResponse());

    const answerResponse: TriviaAnswerResponse = {
      isCorrect: true,
      correctIndex: 0,
      explanation: 'Red is correct',
      isLastQuestion: false,
      envelopeComplete: false,
    };
    mockSubmitTriviaAnswer.mockResolvedValue(answerResponse);

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Select and submit to transition to revealing phase
    act(() => {
      result.current.selectOption(0);
    });

    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(result.current.phase).toBe('revealing');

    // Now selectOption should be ignored in revealing phase
    act(() => {
      result.current.selectOption(1);
    });

    // selectedAnswer should remain unchanged (still 0 from before submit)
    expect(result.current.selectedAnswer).toBe(0);
  });

  it('should submit answer and transition to revealing phase', async () => {
    mockGetTriviaState.mockResolvedValue(makeStateResponse());

    const answerResponse: TriviaAnswerResponse = {
      isCorrect: true,
      correctIndex: 0,
      explanation: 'Red is correct',
      isLastQuestion: false,
      envelopeComplete: false,
    };
    mockSubmitTriviaAnswer.mockResolvedValue(answerResponse);

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Select an option first
    act(() => {
      result.current.selectOption(0);
    });

    // Submit the answer
    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(mockSubmitTriviaAnswer).toHaveBeenCalledWith('env-1', 'q1', 0);
    expect(result.current.phase).toBe('revealing');
    expect(result.current.isCorrect).toBe(true);
    expect(result.current.correctIndex).toBe(0);
    expect(result.current.explanation).toBe('Red is correct');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle submit answer error and stay in answering phase', async () => {
    mockGetTriviaState.mockResolvedValue(makeStateResponse());
    mockSubmitTriviaAnswer.mockRejectedValue(new Error('Submit failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectOption(0);
    });

    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(result.current.phase).toBe('answering');
    expect(result.current.error).toBe('Failed to submit answer');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should advance to next question and reset per-question state', async () => {
    mockGetTriviaState.mockResolvedValue(makeStateResponse());

    const answerResponse: TriviaAnswerResponse = {
      isCorrect: true,
      correctIndex: 0,
      explanation: 'Red is correct',
      isLastQuestion: false,
      envelopeComplete: false,
    };
    mockSubmitTriviaAnswer.mockResolvedValue(answerResponse);

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Answer the first question
    act(() => {
      result.current.selectOption(0);
    });

    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(result.current.phase).toBe('revealing');
    expect(result.current.currentIndex).toBe(0);

    // Advance to next question
    act(() => {
      result.current.advance();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentQuestion).toEqual(QUESTION_B);
    expect(result.current.phase).toBe('answering');
    expect(result.current.selectedAnswer).toBeNull();
    expect(result.current.isCorrect).toBeNull();
    expect(result.current.correctIndex).toBeNull();
    expect(result.current.explanation).toBeNull();
  });

  it('should transition to complete phase on last question advance', async () => {
    mockGetTriviaState.mockResolvedValue(
      makeStateResponse({ currentQuestionIndex: 1 })
    );

    const answerResponse: TriviaAnswerResponse = {
      isCorrect: true,
      correctIndex: 1,
      explanation: 'Two',
      isLastQuestion: true,
      envelopeComplete: true,
    };
    mockSubmitTriviaAnswer.mockResolvedValue(answerResponse);

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentIndex).toBe(1);

    // Answer the last question
    act(() => {
      result.current.selectOption(1);
    });

    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(result.current.phase).toBe('revealing');

    // Advance on the last question
    act(() => {
      result.current.advance();
    });

    expect(result.current.phase).toBe('complete');
  });

  it('should handle load error and retry successfully', async () => {
    mockGetTriviaState.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load trivia');

    // Now retry successfully
    mockGetTriviaState.mockResolvedValue(makeStateResponse());

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.questions).toHaveLength(2);
    expect(result.current.phase).toBe('answering');
  });

  it('should not submit when no option is selected', async () => {
    mockGetTriviaState.mockResolvedValue(makeStateResponse());

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.selectedAnswer).toBeNull();

    await act(async () => {
      await result.current.submitAnswer();
    });

    expect(mockSubmitTriviaAnswer).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('answering');
  });

  it('should derive isLastQuestion correctly', async () => {
    mockGetTriviaState.mockResolvedValue(makeStateResponse());

    const answerResponse: TriviaAnswerResponse = {
      isCorrect: true,
      correctIndex: 0,
      explanation: 'Red is correct',
      isLastQuestion: false,
      envelopeComplete: false,
    };
    mockSubmitTriviaAnswer.mockResolvedValue(answerResponse);

    const { result } = renderHook(() => useTrivia({ envelopeId: 'env-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // On first question (index 0 of 2) - not last
    expect(result.current.isLastQuestion).toBe(false);

    // Answer and advance to second question
    act(() => {
      result.current.selectOption(0);
    });

    await act(async () => {
      await result.current.submitAnswer();
    });

    act(() => {
      result.current.advance();
    });

    // On second question (index 1 of 2) - is last
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isLastQuestion).toBe(true);
  });
});
