import { useState, useEffect, useCallback, useRef } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { LetterPrompt, Envelope } from 'shared';
import { Button, Card, Text } from '../common';
import {
  getLetterPromptForEnvelope,
  createLetterPrompt,
  updateLetterPrompt,
  deleteLetterPrompt,
  getEnvelopes,
} from '../../services/api';
import { STRINGS } from '../../constants/strings';
import './LetterContentTab.css';

type ViewMode =
  | { type: 'display' }
  | { type: 'create' }
  | { type: 'edit' };

/**
 * Letter content management tab.
 * Manages one letter prompt per envelope: select envelope, view/create/edit/delete prompt.
 * Each letter envelope has at most one prompt (1:1 relationship).
 */
export function LetterContentTab() {
  const [letterEnvelopes, setLetterEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<LetterPrompt | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>({ type: 'display' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Form field
  const [promptText, setPromptText] = useState('');

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load letter envelopes
  useEffect(() => {
    async function loadEnvelopes() {
      try {
        const envelopes = await getEnvelopes();
        if (mountedRef.current) {
          setLetterEnvelopes(envelopes.filter((e) => e.type === 'letter'));
        }
      } catch {
        // Silent error
      }
    }
    loadEnvelopes();
  }, []);

  const loadPrompt = useCallback(async (envelopeId: string) => {
    setIsLoading(true);
    try {
      const data = await getLetterPromptForEnvelope(envelopeId);
      if (mountedRef.current) {
        setPrompt(data);
      }
    } catch {
      if (mountedRef.current) {
        setPrompt(null);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load prompt when envelope selection changes
  useEffect(() => {
    if (selectedEnvelopeId) {
      loadPrompt(selectedEnvelopeId);
      setViewMode({ type: 'display' });
      setDeleteConfirm(false);
    } else {
      setPrompt(null);
    }
  }, [selectedEnvelopeId, loadPrompt]);

  const openCreateForm = useCallback(() => {
    setPromptText('');
    setViewMode({ type: 'create' });
  }, []);

  const openEditForm = useCallback(() => {
    if (prompt) {
      setPromptText(prompt.prompt);
      setViewMode({ type: 'edit' });
    }
  }, [prompt]);

  const closeForm = useCallback(() => {
    setViewMode({ type: 'display' });
    setPromptText('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!promptText.trim()) return;
    if (!selectedEnvelopeId) return;

    setIsSaving(true);
    try {
      if (viewMode.type === 'create') {
        await createLetterPrompt({
          envelopeId: selectedEnvelopeId,
          prompt: promptText.trim(),
        });
      } else if (viewMode.type === 'edit' && prompt) {
        await updateLetterPrompt(prompt.id, {
          prompt: promptText.trim(),
        });
      }
      await loadPrompt(selectedEnvelopeId);
      closeForm();
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [promptText, selectedEnvelopeId, viewMode, prompt, loadPrompt, closeForm]);

  const handleDelete = useCallback(async () => {
    if (!prompt || !selectedEnvelopeId) return;
    setIsSaving(true);
    try {
      await deleteLetterPrompt(prompt.id);
      await loadPrompt(selectedEnvelopeId);
      setDeleteConfirm(false);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [prompt, selectedEnvelopeId, loadPrompt]);

  // Show form if in create/edit mode
  if (viewMode.type !== 'display') {
    return (
      <div className="letter-content-tab">
        <h3 className="letter-content-tab__heading">
          {viewMode.type === 'create' ? STRINGS.LETTER_ADMIN_CREATE : STRINGS.LETTER_ADMIN_EDIT}
        </h3>
        <Card className="letter-content-tab__card">
          <div className="letter-content-tab__form">
            <div className="letter-content-tab__field">
              <label
                htmlFor="letter-prompt-text"
                className="letter-content-tab__label"
              >
                {STRINGS.LETTER_ADMIN_PROMPT_LABEL}
              </label>
              <span className="letter-content-tab__hint">
                {STRINGS.LETTER_ADMIN_PROMPT_HINT}
              </span>
              <textarea
                id="letter-prompt-text"
                className="letter-content-tab__textarea"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g., Write a letter to your baby about what you hope for their future..."
                maxLength={1000}
              />
            </div>
            <div className="letter-content-tab__form-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={closeForm}
                disabled={isSaving}
              >
                {STRINGS.LETTER_ADMIN_CANCEL}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !promptText.trim()}
              >
                {isSaving ? STRINGS.LETTER_ADMIN_SAVING : STRINGS.LETTER_ADMIN_SAVE}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="letter-content-tab">
      <h3 className="letter-content-tab__heading">
        {STRINGS.LETTER_ADMIN_HEADING}
      </h3>

      {letterEnvelopes.length === 0 ? (
        <Text color="muted">{STRINGS.LETTER_ADMIN_NO_ENVELOPES}</Text>
      ) : (
        <>
          <div className="letter-content-tab__envelope-select">
            <label
              htmlFor="letter-envelope-select"
              className="letter-content-tab__select-label"
            >
              {STRINGS.LETTER_ADMIN_SELECT_ENVELOPE}
            </label>
            <select
              id="letter-envelope-select"
              className="letter-content-tab__select"
              value={selectedEnvelopeId ?? ''}
              onChange={(e) => setSelectedEnvelopeId(e.target.value || null)}
            >
              <option value="">Choose an envelope...</option>
              {letterEnvelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.title}
                </option>
              ))}
            </select>
          </div>

          {selectedEnvelopeId && (
            <>
              {isLoading ? (
                <div className="letter-content-tab__loading">
                  <Text color="muted">Loading prompt...</Text>
                </div>
              ) : prompt ? (
                <Card className="letter-content-tab__card">
                  <div className="letter-content-tab__prompt-display">
                    <span className="letter-content-tab__prompt-text">
                      {prompt.prompt}
                    </span>
                  </div>
                  <div className="letter-content-tab__actions">
                    <button
                      className="letter-content-tab__btn"
                      onClick={openEditForm}
                      aria-label="Edit prompt"
                      disabled={isSaving}
                    >
                      <Edit2 size={16} />
                    </button>
                    {deleteConfirm ? (
                      <>
                        <span className="letter-content-tab__delete-confirm">
                          {STRINGS.LETTER_ADMIN_CONFIRM_DELETE}
                        </span>
                        <button
                          className="letter-content-tab__btn letter-content-tab__btn--danger"
                          onClick={handleDelete}
                          disabled={isSaving}
                        >
                          {STRINGS.LETTER_ADMIN_DELETE}
                        </button>
                        <button
                          className="letter-content-tab__btn"
                          onClick={() => setDeleteConfirm(false)}
                          disabled={isSaving}
                        >
                          {STRINGS.LETTER_ADMIN_CANCEL}
                        </button>
                      </>
                    ) : (
                      <button
                        className="letter-content-tab__btn letter-content-tab__btn--danger"
                        onClick={() => setDeleteConfirm(true)}
                        aria-label="Delete prompt"
                        disabled={isSaving}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="letter-content-tab__empty">
                  <Text color="muted">{STRINGS.LETTER_ADMIN_EMPTY}</Text>
                  <div className="letter-content-tab__create-action">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={openCreateForm}
                    >
                      {STRINGS.LETTER_ADMIN_CREATE}
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
