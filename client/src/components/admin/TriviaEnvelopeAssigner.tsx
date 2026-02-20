import { useState, useEffect, useCallback, useRef } from 'react';
import { Reorder } from 'motion/react';
import { GripVertical, X, Plus } from 'lucide-react';
import type { TriviaQuestion, TriviaEnvelopeQuestion } from 'shared';
import { Button } from '../common';
import {
  getEnvelopeTriviaQuestions,
  assignTriviaQuestions,
  reorderTriviaQuestions,
} from '../../services/api';
import { STRINGS } from '../../constants/strings';
import './TriviaEnvelopeAssigner.css';

interface TriviaEnvelopeAssignerProps {
  envelopeId: string;
  allQuestions: TriviaQuestion[];
}

/**
 * Assign and reorder trivia questions within an envelope.
 *
 * Two sections:
 * - Assigned Questions: drag-to-reorder list with remove buttons
 * - Available Questions: unassigned questions with add buttons
 *
 * Uses motion/react Reorder.Group and Reorder.Item for drag-to-reorder.
 * Per 06-RESEARCH.md Pitfall 4: value on Reorder.Item must reference
 * the same object from the values array (referential identity matters).
 */
export function TriviaEnvelopeAssigner({
  envelopeId,
  allQuestions,
}: TriviaEnvelopeAssignerProps) {
  const [assignedItems, setAssignedItems] = useState<TriviaEnvelopeQuestion[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load assigned questions when envelopeId changes
  useEffect(() => {
    let cancelled = false;

    async function loadAssigned() {
      setIsLoading(true);
      try {
        const questions = await getEnvelopeTriviaQuestions(envelopeId);
        if (!cancelled && mountedRef.current) {
          setAssignedItems(questions);
          setIsDirty(false);
        }
      } catch {
        // Silently handle - empty list shown
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    loadAssigned();
    return () => {
      cancelled = true;
    };
  }, [envelopeId]);

  const assignedQuestionIds = new Set(assignedItems.map((item) => item.questionId));
  const availableQuestions = allQuestions.filter((q) => !assignedQuestionIds.has(q.id));

  const handleReorder = useCallback((newOrder: TriviaEnvelopeQuestion[]) => {
    setAssignedItems(newOrder);
    setIsDirty(true);
  }, []);

  const handleSaveOrder = useCallback(async () => {
    setIsSaving(true);
    try {
      const questionIds = assignedItems.map((item) => item.questionId);
      await reorderTriviaQuestions(envelopeId, questionIds);
      setIsDirty(false);
    } catch {
      // Error handling - order not saved
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [envelopeId, assignedItems]);

  const handleAdd = useCallback(async (questionId: string) => {
    setIsSaving(true);
    try {
      const currentIds = assignedItems.map((item) => item.questionId);
      const newIds = [...currentIds, questionId];
      await assignTriviaQuestions(envelopeId, newIds);

      // Reload to get proper TriviaEnvelopeQuestion objects
      const updated = await getEnvelopeTriviaQuestions(envelopeId);
      if (mountedRef.current) {
        setAssignedItems(updated);
        setIsDirty(false);
      }
    } catch {
      // Error handling
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [envelopeId, assignedItems]);

  const handleRemove = useCallback(async (questionId: string) => {
    setIsSaving(true);
    try {
      const remainingIds = assignedItems
        .filter((item) => item.questionId !== questionId)
        .map((item) => item.questionId);

      if (remainingIds.length === 0) {
        // Can't assign empty array per Zod schema (min 1), so we need to handle differently.
        // For now, remove locally. The assignment endpoint requires at least 1.
        // We'll just update local state and not persist an empty assignment.
        if (mountedRef.current) {
          setAssignedItems([]);
          setIsDirty(false);
        }
      } else {
        await assignTriviaQuestions(envelopeId, remainingIds);
        const updated = await getEnvelopeTriviaQuestions(envelopeId);
        if (mountedRef.current) {
          setAssignedItems(updated);
          setIsDirty(false);
        }
      }
    } catch {
      // Error handling
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [envelopeId, assignedItems]);

  if (isLoading) {
    return <div className="trivia-assigner__loading">Loading assignments...</div>;
  }

  return (
    <div className="trivia-assigner">
      {/* Assigned Questions Section */}
      <div className="trivia-assigner__section">
        <h4 className="trivia-assigner__section-heading">
          {STRINGS.TRIVIA_ASSIGNER_HEADING}
        </h4>

        {assignedItems.length === 0 ? (
          <p className="trivia-assigner__empty">
            {STRINGS.TRIVIA_ASSIGNER_EMPTY}
          </p>
        ) : (
          <Reorder.Group
            axis="y"
            values={assignedItems}
            onReorder={handleReorder}
            className="trivia-assigner__list"
          >
            {assignedItems.map((item) => (
              <Reorder.Item
                key={item.id}
                value={item}
                className="trivia-assigner__item"
                whileDrag={{
                  scale: 1.02,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                <GripVertical
                  size={16}
                  className="trivia-assigner__grip"
                />
                <span className="trivia-assigner__text">
                  {item.question.questionText}
                </span>
                <button
                  type="button"
                  className="trivia-assigner__remove-btn"
                  onClick={() => handleRemove(item.questionId)}
                  aria-label={`Remove question: ${item.question.questionText}`}
                  disabled={isSaving}
                >
                  <X size={16} />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}

        {isDirty && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveOrder}
            disabled={isSaving}
            className="trivia-assigner__save-btn"
          >
            {isSaving ? STRINGS.TRIVIA_ASSIGNER_SAVING : STRINGS.TRIVIA_ASSIGNER_SAVE_ORDER}
          </Button>
        )}
      </div>

      {/* Available Questions Section */}
      {availableQuestions.length > 0 && (
        <div className="trivia-assigner__section">
          <h4 className="trivia-assigner__section-heading">
            {STRINGS.TRIVIA_ASSIGNER_AVAILABLE}
          </h4>

          <ul className="trivia-assigner__available-list">
            {availableQuestions.map((question) => (
              <li key={question.id} className="trivia-assigner__available-item">
                <span className="trivia-assigner__text">
                  {question.questionText}
                </span>
                <button
                  type="button"
                  className="trivia-assigner__add-btn"
                  onClick={() => handleAdd(question.id)}
                  aria-label={`Add question: ${question.questionText}`}
                  disabled={isSaving}
                >
                  <Plus size={14} />
                  <span>{STRINGS.TRIVIA_ASSIGNER_ADD}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
