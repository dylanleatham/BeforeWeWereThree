import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { TriviaQuestion, CreateTriviaQuestionRequest, Envelope } from 'shared';
import { Button, Card, Text } from '../common';
import { TriviaQuestionForm } from './TriviaQuestionForm';
import { TriviaEnvelopeAssigner } from './TriviaEnvelopeAssigner';
import {
  getTriviaQuestions,
  createTriviaQuestion,
  updateTriviaQuestion,
  deleteTriviaQuestion,
  getEnvelopes,
} from '../../services/api';
import { STRINGS } from '../../constants/strings';
import './TriviaContentTab.css';

type FormMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; question: TriviaQuestion };

/**
 * Trivia content management tab.
 * Manages the question library (CRUD) and envelope question assignment.
 */
export function TriviaContentTab() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [formMode, setFormMode] = useState<FormMode>({ type: 'closed' });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Envelope assignment state
  const [triviaEnvelopes, setTriviaEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      const data = await getTriviaQuestions();
      if (mountedRef.current) {
        setQuestions(data);
      }
    } catch {
      // Silent error - empty list shown
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadEnvelopes = useCallback(async () => {
    try {
      const envelopes = await getEnvelopes();
      if (mountedRef.current) {
        const trivia = envelopes.filter((e) => e.type === 'trivia');
        setTriviaEnvelopes(trivia);
      }
    } catch {
      // Silent error
    }
  }, []);

  useEffect(() => {
    loadQuestions();
    loadEnvelopes();
  }, [loadQuestions, loadEnvelopes]);

  const handleCreate = useCallback(async (data: CreateTriviaQuestionRequest) => {
    setIsSaving(true);
    try {
      await createTriviaQuestion(data);
      await loadQuestions();
      setFormMode({ type: 'closed' });
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [loadQuestions]);

  const handleUpdate = useCallback(async (data: CreateTriviaQuestionRequest) => {
    if (formMode.type !== 'edit') return;

    setIsSaving(true);
    try {
      await updateTriviaQuestion(formMode.question.id, data);
      await loadQuestions();
      setFormMode({ type: 'closed' });
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [formMode, loadQuestions]);

  const handleDelete = useCallback(async (id: string) => {
    setIsSaving(true);
    try {
      await deleteTriviaQuestion(id);
      await loadQuestions();
      setDeleteConfirm(null);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [loadQuestions]);

  // Show form if in create/edit mode
  if (formMode.type !== 'closed') {
    return (
      <div className="trivia-content-tab">
        <TriviaQuestionForm
          question={formMode.type === 'edit' ? formMode.question : undefined}
          onSave={formMode.type === 'create' ? handleCreate : handleUpdate}
          onCancel={() => setFormMode({ type: 'closed' })}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="trivia-content-tab">
      {/* Question Library Section */}
      <header className="trivia-content-tab__header">
        <h3 className="trivia-content-tab__heading">
          {STRINGS.TRIVIA_ADMIN_HEADING}
        </h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setFormMode({ type: 'create' })}
          disabled={isLoading}
        >
          <Plus size={16} />
          <span>{STRINGS.TRIVIA_ADMIN_ADD}</span>
        </Button>
      </header>

      {isLoading ? (
        <div className="trivia-content-tab__loading">
          <Text color="muted">Loading questions...</Text>
        </div>
      ) : questions.length === 0 ? (
        <Card className="trivia-content-tab__empty">
          <Text color="muted">{STRINGS.TRIVIA_ADMIN_EMPTY}</Text>
        </Card>
      ) : (
        <ul className="trivia-content-tab__list">
          {questions.map((question) => (
            <li key={question.id} className="trivia-content-tab__item">
              <Card className="trivia-content-tab__card">
                <div className="trivia-content-tab__question-info">
                  <span className="trivia-content-tab__question-text">
                    {question.questionText}
                  </span>
                  <div className="trivia-content-tab__question-meta">
                    <span className="trivia-content-tab__option-count">
                      {question.options.length} options
                    </span>
                    {question.explanation && (
                      <span className="trivia-content-tab__has-explanation">
                        Has explanation
                      </span>
                    )}
                  </div>
                </div>
                <div className="trivia-content-tab__actions">
                  <button
                    className="trivia-content-tab__btn"
                    onClick={() => setFormMode({ type: 'edit', question })}
                    aria-label={`Edit question: ${question.questionText}`}
                    disabled={isSaving}
                  >
                    <Edit2 size={16} />
                  </button>
                  {deleteConfirm === question.id ? (
                    <>
                      <button
                        className="trivia-content-tab__btn trivia-content-tab__btn--danger"
                        onClick={() => handleDelete(question.id)}
                        disabled={isSaving}
                      >
                        {STRINGS.TRIVIA_ADMIN_CONFIRM_DELETE}
                      </button>
                      <button
                        className="trivia-content-tab__btn"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={isSaving}
                      >
                        {STRINGS.TRIVIA_ADMIN_CANCEL}
                      </button>
                    </>
                  ) : (
                    <button
                      className="trivia-content-tab__btn trivia-content-tab__btn--danger"
                      onClick={() => setDeleteConfirm(question.id)}
                      aria-label={`Delete question: ${question.questionText}`}
                      disabled={isSaving}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Envelope Assignment Section */}
      <section className="trivia-content-tab__assigner-section">
        <h3 className="trivia-content-tab__heading">
          Envelope Assignment
        </h3>

        {triviaEnvelopes.length === 0 ? (
          <Text color="muted">{STRINGS.TRIVIA_ASSIGNER_NO_ENVELOPES}</Text>
        ) : (
          <>
            <div className="trivia-content-tab__envelope-select">
              <label
                htmlFor="trivia-envelope-select"
                className="trivia-content-tab__select-label"
              >
                {STRINGS.TRIVIA_ASSIGNER_SELECT_ENVELOPE}
              </label>
              <select
                id="trivia-envelope-select"
                className="trivia-content-tab__select"
                value={selectedEnvelopeId ?? ''}
                onChange={(e) => setSelectedEnvelopeId(e.target.value || null)}
              >
                <option value="">Choose an envelope...</option>
                {triviaEnvelopes.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedEnvelopeId && (
              <TriviaEnvelopeAssigner
                envelopeId={selectedEnvelopeId}
                allQuestions={questions}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
