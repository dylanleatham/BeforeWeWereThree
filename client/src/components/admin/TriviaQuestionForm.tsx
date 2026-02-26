import { useState, useCallback, FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import type { TriviaQuestion, CreateTriviaQuestionRequest } from 'shared';
import { Button } from '../common';
import { STRINGS } from '../../constants/strings';
import './TriviaQuestionForm.css';

interface TriviaQuestionFormProps {
  /** Existing question to edit, or undefined for create */
  question?: TriviaQuestion;
  /** Called on form submit with validated data */
  onSave: (data: CreateTriviaQuestionRequest) => Promise<void>;
  /** Called to cancel/close form */
  onCancel: () => void;
  /** Whether a save is in progress */
  isSaving: boolean;
}

interface FormOption {
  id: string;
  text: string;
}

let optionIdCounter = 0;
function nextOptionId(): string {
  optionIdCounter += 1;
  return `opt-${optionIdCounter}`;
}

/**
 * Form for creating or editing a trivia question.
 * Supports 2-4 dynamic options with correct answer selection.
 */
export function TriviaQuestionForm({
  question,
  onSave,
  onCancel,
  isSaving,
}: TriviaQuestionFormProps) {
  const isEditing = !!question;

  const [questionText, setQuestionText] = useState(question?.questionText ?? '');
  const [options, setOptions] = useState<FormOption[]>(() => {
    if (question) {
      return question.options.map((o) => ({ id: nextOptionId(), text: o.text }));
    }
    return [{ id: nextOptionId(), text: '' }, { id: nextOptionId(), text: '' }];
  });
  const [correctIndex, setCorrectIndex] = useState<number>(() => {
    if (question) {
      const idx = question.options.findIndex((o) => o.isCorrect);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleAddOption = useCallback(() => {
    if (options.length < 4) {
      setOptions((prev) => [...prev, { id: nextOptionId(), text: '' }]);
    }
  }, [options.length]);

  const handleRemoveOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setCorrectIndex((prev) => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  }, []);

  const handleOptionChange = useCallback((index: number, text: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text } : o)));
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!questionText.trim()) {
        setError('Question text is required');
        return;
      }

      const emptyOption = options.findIndex((o) => !o.text.trim());
      if (emptyOption >= 0) {
        setError(`Option ${emptyOption + 1} text is required`);
        return;
      }

      const data: CreateTriviaQuestionRequest = {
        questionText: questionText.trim(),
        options: options.map((o, i) => ({
          text: o.text.trim(),
          isCorrect: i === correctIndex,
        })),
        explanation: explanation.trim() || null,
      };

      try {
        await onSave(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save question');
      }
    },
    [questionText, options, correctIndex, explanation, onSave]
  );

  return (
    <form className="trivia-question-form" onSubmit={handleSubmit}>
      <h3 className="trivia-question-form__title">
        {isEditing ? 'Edit Question' : 'New Question'}
      </h3>

      {error && (
        <div className="trivia-question-form__error" role="alert">
          {error}
        </div>
      )}

      <div className="trivia-question-form__field">
        <label htmlFor="trivia-question-text" className="trivia-question-form__label">
          {STRINGS.TRIVIA_ADMIN_QUESTION_LABEL}
        </label>
        <textarea
          id="trivia-question-text"
          className="trivia-question-form__textarea"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="e.g., How big is baby at 20 weeks?"
          maxLength={1000}
          rows={3}
          disabled={isSaving}
          autoFocus
        />
      </div>

      <fieldset className="trivia-question-form__options-fieldset">
        <legend className="trivia-question-form__label">
          Options
        </legend>

        {options.map((option, index) => (
          <div key={option.id} className="trivia-question-form__option-row">
            <div className="trivia-question-form__option-input-group">
              <label
                htmlFor={`trivia-option-${index}`}
                className="trivia-question-form__option-label"
              >
                {STRINGS.TRIVIA_ADMIN_OPTION_LABEL(index + 1)}
              </label>
              <input
                id={`trivia-option-${index}`}
                type="text"
                className="trivia-question-form__input"
                value={option.text}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={500}
                disabled={isSaving}
              />
            </div>

            <label className="trivia-question-form__correct-radio">
              <input
                type="radio"
                name="correct-answer"
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                disabled={isSaving}
              />
              <span className="trivia-question-form__correct-label">
                {STRINGS.TRIVIA_ADMIN_CORRECT_LABEL}
              </span>
            </label>

            {options.length > 2 && (
              <button
                type="button"
                className="trivia-question-form__remove-btn"
                onClick={() => handleRemoveOption(index)}
                aria-label={`Remove option ${index + 1}`}
                disabled={isSaving}
              >
                <X size={16} />
                <span>{STRINGS.TRIVIA_ADMIN_REMOVE_OPTION}</span>
              </button>
            )}
          </div>
        ))}

        {options.length < 4 && (
          <button
            type="button"
            className="trivia-question-form__add-option-btn"
            onClick={handleAddOption}
            disabled={isSaving}
          >
            <Plus size={16} />
            <span>{STRINGS.TRIVIA_ADMIN_ADD_OPTION}</span>
          </button>
        )}
      </fieldset>

      <div className="trivia-question-form__field">
        <label htmlFor="trivia-explanation" className="trivia-question-form__label">
          {STRINGS.TRIVIA_ADMIN_EXPLANATION_LABEL}
        </label>
        <textarea
          id="trivia-explanation"
          className="trivia-question-form__textarea"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder={STRINGS.TRIVIA_ADMIN_EXPLANATION_HINT}
          maxLength={2000}
          rows={2}
          disabled={isSaving}
        />
        <p className="trivia-question-form__hint">
          {STRINGS.TRIVIA_ADMIN_EXPLANATION_HINT}
        </p>
      </div>

      <div className="trivia-question-form__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          {STRINGS.TRIVIA_ADMIN_CANCEL}
        </Button>
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? STRINGS.TRIVIA_ADMIN_SAVING : STRINGS.TRIVIA_ADMIN_SAVE}
        </Button>
      </div>
    </form>
  );
}
