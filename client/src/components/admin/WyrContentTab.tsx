import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { WYRPrompt, Envelope } from 'shared';
import { Button, Card, Text } from '../common';
import {
  getWyrPromptsForEnvelope,
  createWyrPrompt,
  updateWyrPrompt,
  deleteWyrPrompt,
  getEnvelopes,
} from '../../services/api';
import { STRINGS } from '../../constants/strings';
import './WyrContentTab.css';

type FormMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; prompt: WYRPrompt };

/**
 * WYR content management tab.
 * Manages WYR prompts per envelope: select envelope, view/create/edit/delete prompts.
 */
export function WyrContentTab() {
  const [wyrEnvelopes, setWyrEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<WYRPrompt[]>([]);
  const [formMode, setFormMode] = useState<FormMode>({ type: 'closed' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load WYR envelopes
  useEffect(() => {
    async function loadEnvelopes() {
      try {
        const envelopes = await getEnvelopes();
        if (mountedRef.current) {
          setWyrEnvelopes(envelopes.filter((e) => e.type === 'would-you-rather'));
        }
      } catch {
        // Silent error
      }
    }
    loadEnvelopes();
  }, []);

  const loadPrompts = useCallback(async (envelopeId: string) => {
    setIsLoading(true);
    try {
      const data = await getWyrPromptsForEnvelope(envelopeId);
      if (mountedRef.current) {
        setPrompts(data);
      }
    } catch {
      if (mountedRef.current) {
        setPrompts([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load prompts when envelope selection changes
  useEffect(() => {
    if (selectedEnvelopeId) {
      loadPrompts(selectedEnvelopeId);
    } else {
      setPrompts([]);
    }
  }, [selectedEnvelopeId, loadPrompts]);

  const openCreateForm = useCallback(() => {
    setOptionA('');
    setOptionB('');
    setFormMode({ type: 'create' });
  }, []);

  const openEditForm = useCallback((prompt: WYRPrompt) => {
    setOptionA(prompt.optionA);
    setOptionB(prompt.optionB);
    setFormMode({ type: 'edit', prompt });
  }, []);

  const closeForm = useCallback(() => {
    setFormMode({ type: 'closed' });
    setOptionA('');
    setOptionB('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!optionA.trim() || !optionB.trim()) return;
    if (!selectedEnvelopeId) return;

    setIsSaving(true);
    setError(null);
    try {
      if (formMode.type === 'create') {
        await createWyrPrompt({
          envelopeId: selectedEnvelopeId,
          optionA: optionA.trim(),
          optionB: optionB.trim(),
        });
      } else if (formMode.type === 'edit') {
        await updateWyrPrompt(formMode.prompt.id, {
          optionA: optionA.trim(),
          optionB: optionB.trim(),
        });
      }
      await loadPrompts(selectedEnvelopeId);
      closeForm();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to save prompt');
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [optionA, optionB, selectedEnvelopeId, formMode, loadPrompts, closeForm]);

  const handleDelete = useCallback(async (id: string) => {
    if (!selectedEnvelopeId) return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteWyrPrompt(id);
      await loadPrompts(selectedEnvelopeId);
      setDeleteConfirm(null);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete prompt');
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [selectedEnvelopeId, loadPrompts]);

  // Show form if in create/edit mode
  if (formMode.type !== 'closed') {
    return (
      <div className="wyr-content-tab">
        <h3 className="wyr-content-tab__heading">
          {formMode.type === 'create' ? STRINGS.WYR_ADMIN_ADD : 'Edit Prompt'}
        </h3>
        {error && (
          <div className="wyr-content-tab__error" role="alert">
            {error}
          </div>
        )}
        <Card className="wyr-content-tab__card">
          <div className="wyr-content-tab__form">
            <div className="wyr-content-tab__field">
              <label
                htmlFor="wyr-option-a"
                className="wyr-content-tab__label"
              >
                {STRINGS.WYR_ADMIN_OPTION_A}
              </label>
              <textarea
                id="wyr-option-a"
                className="wyr-content-tab__textarea"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="e.g., Always know what your baby is thinking"
                maxLength={500}
              />
            </div>
            <div className="wyr-content-tab__field">
              <label
                htmlFor="wyr-option-b"
                className="wyr-content-tab__label"
              >
                {STRINGS.WYR_ADMIN_OPTION_B}
              </label>
              <textarea
                id="wyr-option-b"
                className="wyr-content-tab__textarea"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="e.g., Always know what your baby needs"
                maxLength={500}
              />
            </div>
            <div className="wyr-content-tab__form-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={closeForm}
                disabled={isSaving}
              >
                {STRINGS.WYR_ADMIN_CANCEL}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !optionA.trim() || !optionB.trim()}
              >
                {isSaving ? STRINGS.WYR_ADMIN_SAVING : STRINGS.WYR_ADMIN_SAVE}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="wyr-content-tab">
      <h3 className="wyr-content-tab__heading">
        {STRINGS.WYR_ADMIN_HEADING}
      </h3>

      {error && (
        <div className="wyr-content-tab__error" role="alert">
          {error}
        </div>
      )}

      {wyrEnvelopes.length === 0 ? (
        <Text color="muted">{STRINGS.WYR_ADMIN_NO_ENVELOPES}</Text>
      ) : (
        <>
          <div className="wyr-content-tab__envelope-select">
            <label
              htmlFor="wyr-envelope-select"
              className="wyr-content-tab__select-label"
            >
              {STRINGS.WYR_ADMIN_SELECT_ENVELOPE}
            </label>
            <select
              id="wyr-envelope-select"
              className="wyr-content-tab__select"
              value={selectedEnvelopeId ?? ''}
              onChange={(e) => setSelectedEnvelopeId(e.target.value || null)}
            >
              <option value="">Choose an envelope...</option>
              {wyrEnvelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.title}
                </option>
              ))}
            </select>
          </div>

          {selectedEnvelopeId && (
            <>
              <header className="wyr-content-tab__header">
                <span />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openCreateForm}
                  disabled={isLoading}
                >
                  <Plus size={16} />
                  <span>{STRINGS.WYR_ADMIN_ADD}</span>
                </Button>
              </header>

              {isLoading ? (
                <div className="wyr-content-tab__loading">
                  <Text color="muted">Loading prompts...</Text>
                </div>
              ) : prompts.length === 0 ? (
                <Card className="wyr-content-tab__empty">
                  <Text color="muted">{STRINGS.WYR_ADMIN_EMPTY}</Text>
                </Card>
              ) : (
                <ul className="wyr-content-tab__list">
                  {prompts.map((prompt) => (
                    <li key={prompt.id} className="wyr-content-tab__item">
                      <Card className="wyr-content-tab__card">
                        <div className="wyr-content-tab__prompt-info">
                          <div className="wyr-content-tab__prompt-options">
                            <span className="wyr-content-tab__option-text">
                              <span className="wyr-content-tab__option-label">A:</span>
                              {prompt.optionA}
                            </span>
                            <span className="wyr-content-tab__option-text">
                              <span className="wyr-content-tab__option-label">B:</span>
                              {prompt.optionB}
                            </span>
                          </div>
                          <span className="wyr-content-tab__prompt-order">
                            Sort order: {prompt.sortOrder}
                          </span>
                        </div>
                        <div className="wyr-content-tab__actions">
                          <button
                            className="wyr-content-tab__btn"
                            onClick={() => openEditForm(prompt)}
                            aria-label={`Edit prompt: ${prompt.optionA} or ${prompt.optionB}`}
                            disabled={isSaving}
                          >
                            <Edit2 size={16} />
                          </button>
                          {deleteConfirm === prompt.id ? (
                            <>
                              <button
                                className="wyr-content-tab__btn wyr-content-tab__btn--danger"
                                onClick={() => handleDelete(prompt.id)}
                                disabled={isSaving}
                              >
                                {STRINGS.WYR_ADMIN_CONFIRM_DELETE}
                              </button>
                              <button
                                className="wyr-content-tab__btn"
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isSaving}
                              >
                                {STRINGS.WYR_ADMIN_CANCEL}
                              </button>
                            </>
                          ) : (
                            <button
                              className="wyr-content-tab__btn wyr-content-tab__btn--danger"
                              onClick={() => setDeleteConfirm(prompt.id)}
                              aria-label={`Delete prompt: ${prompt.optionA} or ${prompt.optionB}`}
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
            </>
          )}
        </>
      )}
    </div>
  );
}
