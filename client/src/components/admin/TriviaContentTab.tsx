import { useState, useEffect, useCallback, useRef } from 'react';
import { Reorder } from 'motion/react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import type {
  TriviaEnvelopeQuestion,
  CreateTriviaQuestionRequest,
  Envelope,
} from 'shared';
import { Button, Card, Text } from '../common';
import { TriviaQuestionForm } from './TriviaQuestionForm';
import {
  getEnvelopeTriviaQuestions,
  createTriviaQuestion,
  updateTriviaQuestion,
  deleteTriviaQuestion,
  assignTriviaQuestions,
  reorderTriviaQuestions,
  getEnvelopes,
} from '../../services/api';
import { STRINGS } from '../../constants/strings';
import './TriviaContentTab.css';

type FormMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; question: TriviaEnvelopeQuestion };

/**
 * Trivia content management tab (envelope-first pattern).
 * Select an envelope, then create/edit/delete/reorder questions within it.
 */
export function TriviaContentTab() {
  const [triviaEnvelopes, setTriviaEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TriviaEnvelopeQuestion[]>([]);
  const [formMode, setFormMode] = useState<FormMode>({ type: 'closed' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load trivia envelopes
  useEffect(() => {
    async function loadEnvelopes() {
      try {
        const envelopes = await getEnvelopes();
        if (mountedRef.current) {
          setTriviaEnvelopes(envelopes.filter((e) => e.type === 'trivia'));
        }
      } catch {
        // Silent error
      }
    }
    loadEnvelopes();
  }, []);

  const loadQuestions = useCallback(async (envelopeId: string) => {
    setIsLoading(true);
    try {
      const data = await getEnvelopeTriviaQuestions(envelopeId);
      if (mountedRef.current) {
        setQuestions(data);
        setIsDirty(false);
      }
    } catch {
      if (mountedRef.current) {
        setQuestions([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load questions when envelope selection changes
  useEffect(() => {
    if (selectedEnvelopeId) {
      loadQuestions(selectedEnvelopeId);
    } else {
      setQuestions([]);
    }
  }, [selectedEnvelopeId, loadQuestions]);

  const handleCreate = useCallback(async (data: CreateTriviaQuestionRequest) => {
    if (!selectedEnvelopeId) return;

    setIsSaving(true);
    try {
      const newQuestion = await createTriviaQuestion(data);
      const currentIds = questions.map((item) => item.questionId);
      await assignTriviaQuestions(selectedEnvelopeId, [...currentIds, newQuestion.id]);
      await loadQuestions(selectedEnvelopeId);
      setFormMode({ type: 'closed' });
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [selectedEnvelopeId, questions, loadQuestions]);

  const handleUpdate = useCallback(async (data: CreateTriviaQuestionRequest) => {
    if (formMode.type !== 'edit' || !selectedEnvelopeId) return;

    setIsSaving(true);
    try {
      await updateTriviaQuestion(formMode.question.questionId, data);
      await loadQuestions(selectedEnvelopeId);
      setFormMode({ type: 'closed' });
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [formMode, selectedEnvelopeId, loadQuestions]);

  const handleDelete = useCallback(async (questionId: string) => {
    if (!selectedEnvelopeId) return;

    setIsSaving(true);
    try {
      await deleteTriviaQuestion(questionId);
      await loadQuestions(selectedEnvelopeId);
      setDeleteConfirm(null);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [selectedEnvelopeId, loadQuestions]);

  const handleReorder = useCallback((newOrder: TriviaEnvelopeQuestion[]) => {
    setQuestions(newOrder);
    setIsDirty(true);
  }, []);

  const handleSaveOrder = useCallback(async () => {
    if (!selectedEnvelopeId) return;

    setIsSaving(true);
    try {
      const questionIds = questions.map((item) => item.questionId);
      await reorderTriviaQuestions(selectedEnvelopeId, questionIds);
      setIsDirty(false);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [selectedEnvelopeId, questions]);

  // Show form if in create/edit mode
  if (formMode.type !== 'closed') {
    return (
      <div className="trivia-content-tab">
        <TriviaQuestionForm
          question={formMode.type === 'edit' ? formMode.question.question : undefined}
          onSave={formMode.type === 'create' ? handleCreate : handleUpdate}
          onCancel={() => setFormMode({ type: 'closed' })}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="trivia-content-tab">
      <h3 className="trivia-content-tab__heading">
        {STRINGS.TRIVIA_ADMIN_HEADING}
      </h3>

      {triviaEnvelopes.length === 0 ? (
        <Text color="muted">{STRINGS.TRIVIA_ADMIN_NO_ENVELOPES}</Text>
      ) : (
        <>
          <div className="trivia-content-tab__envelope-select">
            <label
              htmlFor="trivia-envelope-select"
              className="trivia-content-tab__select-label"
            >
              {STRINGS.TRIVIA_ADMIN_SELECT_ENVELOPE}
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
            <>
              <header className="trivia-content-tab__header">
                <span />
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
                <>
                  <Reorder.Group
                    axis="y"
                    values={questions}
                    onReorder={handleReorder}
                    className="trivia-content-tab__list"
                  >
                    {questions.map((item) => (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        className="trivia-content-tab__item"
                        whileDrag={{
                          scale: 1.02,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                      >
                        <GripVertical
                          size={16}
                          className="trivia-content-tab__grip"
                        />
                        <div className="trivia-content-tab__question-info">
                          <span className="trivia-content-tab__question-text">
                            {item.question.questionText}
                          </span>
                          <div className="trivia-content-tab__question-meta">
                            <span className="trivia-content-tab__option-count">
                              {item.question.options.length} options
                            </span>
                            {item.question.explanation && (
                              <span className="trivia-content-tab__has-explanation">
                                Has explanation
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="trivia-content-tab__actions">
                          <button
                            className="trivia-content-tab__btn"
                            onClick={() => setFormMode({ type: 'edit', question: item })}
                            aria-label={`Edit question: ${item.question.questionText}`}
                            disabled={isSaving}
                          >
                            <Edit2 size={16} />
                          </button>
                          {deleteConfirm === item.questionId ? (
                            <>
                              <button
                                className="trivia-content-tab__btn trivia-content-tab__btn--danger"
                                onClick={() => handleDelete(item.questionId)}
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
                              onClick={() => setDeleteConfirm(item.questionId)}
                              aria-label={`Delete question: ${item.question.questionText}`}
                              disabled={isSaving}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  {isDirty && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveOrder}
                      disabled={isSaving}
                      className="trivia-content-tab__save-order-btn"
                    >
                      {isSaving ? STRINGS.TRIVIA_ADMIN_SAVING : STRINGS.TRIVIA_ADMIN_SAVE_ORDER}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
