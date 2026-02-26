import { useState, useEffect, useCallback, useRef } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { PhotoPrompt, Envelope } from 'shared';
import { Button, Card, Text } from '../common';
import {
  getPhotoPromptForEnvelope,
  createPhotoPrompt,
  updatePhotoPrompt,
  deletePhotoPrompt,
  getEnvelopes,
} from '../../services/api';
import { STRINGS } from '../../constants/strings';
import './PhotoPromptContentTab.css';

type ViewMode =
  | { type: 'display' }
  | { type: 'create' }
  | { type: 'edit' };

/**
 * Photo Prompt content management tab.
 * Manages one photo prompt per envelope: select envelope, view/create/edit/delete prompt.
 * Each photo-prompt envelope has at most one prompt (1:1 relationship).
 */
export function PhotoPromptContentTab() {
  const [photoPromptEnvelopes, setPhotoPromptEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PhotoPrompt | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>({ type: 'display' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promptText, setPromptText] = useState('');

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load photo-prompt envelopes
  useEffect(() => {
    async function loadEnvelopes() {
      try {
        const envelopes = await getEnvelopes();
        if (mountedRef.current) {
          setPhotoPromptEnvelopes(envelopes.filter((e) => e.type === 'photo-prompt'));
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
      const data = await getPhotoPromptForEnvelope(envelopeId);
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
    setError(null);
    try {
      if (viewMode.type === 'create') {
        await createPhotoPrompt({
          envelopeId: selectedEnvelopeId,
          prompt: promptText.trim(),
        });
      } else if (viewMode.type === 'edit' && prompt) {
        await updatePhotoPrompt(prompt.id, {
          prompt: promptText.trim(),
        });
      }
      await loadPrompt(selectedEnvelopeId);
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
  }, [promptText, selectedEnvelopeId, viewMode, prompt, loadPrompt, closeForm]);

  const handleDelete = useCallback(async () => {
    if (!prompt || !selectedEnvelopeId) return;
    setIsSaving(true);
    setError(null);
    try {
      await deletePhotoPrompt(prompt.id);
      await loadPrompt(selectedEnvelopeId);
      setDeleteConfirm(false);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete prompt');
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [prompt, selectedEnvelopeId, loadPrompt]);

  // Show form if in create/edit mode
  if (viewMode.type !== 'display') {
    return (
      <div className="photo-prompt-content-tab">
        <h3 className="photo-prompt-content-tab__heading">
          {viewMode.type === 'create' ? STRINGS.PHOTO_PROMPT_ADMIN_CREATE : STRINGS.PHOTO_PROMPT_ADMIN_EDIT}
        </h3>
        {error && (
          <div className="photo-prompt-content-tab__error" role="alert">
            {error}
          </div>
        )}
        <Card className="photo-prompt-content-tab__card">
          <div className="photo-prompt-content-tab__form">
            <div className="photo-prompt-content-tab__field">
              <label
                htmlFor="photo-prompt-text"
                className="photo-prompt-content-tab__label"
              >
                {STRINGS.PHOTO_PROMPT_ADMIN_PROMPT_LABEL}
              </label>
              <span className="photo-prompt-content-tab__hint">
                {STRINGS.PHOTO_PROMPT_ADMIN_PROMPT_HINT}
              </span>
              <textarea
                id="photo-prompt-text"
                className="photo-prompt-content-tab__textarea"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder='e.g., "Take a silly selfie on the beach"'
                maxLength={1000}
              />
            </div>
            <div className="photo-prompt-content-tab__form-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={closeForm}
                disabled={isSaving}
              >
                {STRINGS.PHOTO_PROMPT_ADMIN_CANCEL}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !promptText.trim()}
              >
                {isSaving ? STRINGS.PHOTO_PROMPT_ADMIN_SAVING : STRINGS.PHOTO_PROMPT_ADMIN_SAVE}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="photo-prompt-content-tab">
      <h3 className="photo-prompt-content-tab__heading">
        {STRINGS.PHOTO_PROMPT_ADMIN_HEADING}
      </h3>

      {error && (
        <div className="photo-prompt-content-tab__error" role="alert">
          {error}
        </div>
      )}

      {photoPromptEnvelopes.length === 0 ? (
        <Text color="muted">{STRINGS.PHOTO_PROMPT_ADMIN_NO_ENVELOPES}</Text>
      ) : (
        <>
          <div className="photo-prompt-content-tab__envelope-select">
            <label
              htmlFor="photo-prompt-envelope-select"
              className="photo-prompt-content-tab__select-label"
            >
              {STRINGS.PHOTO_PROMPT_ADMIN_SELECT_ENVELOPE}
            </label>
            <select
              id="photo-prompt-envelope-select"
              className="photo-prompt-content-tab__select"
              value={selectedEnvelopeId ?? ''}
              onChange={(e) => setSelectedEnvelopeId(e.target.value || null)}
            >
              <option value="">Choose an envelope...</option>
              {photoPromptEnvelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.title}
                </option>
              ))}
            </select>
          </div>

          {selectedEnvelopeId && (
            <>
              {isLoading ? (
                <div className="photo-prompt-content-tab__loading">
                  <Text color="muted">Loading prompt...</Text>
                </div>
              ) : prompt ? (
                <Card className="photo-prompt-content-tab__card">
                  <div className="photo-prompt-content-tab__prompt-display">
                    <span className="photo-prompt-content-tab__prompt-text">
                      {prompt.prompt}
                    </span>
                  </div>
                  <div className="photo-prompt-content-tab__actions">
                    <button
                      className="photo-prompt-content-tab__btn"
                      onClick={openEditForm}
                      aria-label="Edit prompt"
                      disabled={isSaving}
                    >
                      <Edit2 size={16} />
                    </button>
                    {deleteConfirm ? (
                      <>
                        <span className="photo-prompt-content-tab__delete-confirm">
                          {STRINGS.PHOTO_PROMPT_ADMIN_CONFIRM_DELETE}
                        </span>
                        <button
                          className="photo-prompt-content-tab__btn photo-prompt-content-tab__btn--danger"
                          onClick={handleDelete}
                          disabled={isSaving}
                        >
                          {STRINGS.PHOTO_PROMPT_ADMIN_DELETE}
                        </button>
                        <button
                          className="photo-prompt-content-tab__btn"
                          onClick={() => setDeleteConfirm(false)}
                          disabled={isSaving}
                        >
                          {STRINGS.PHOTO_PROMPT_ADMIN_CANCEL}
                        </button>
                      </>
                    ) : (
                      <button
                        className="photo-prompt-content-tab__btn photo-prompt-content-tab__btn--danger"
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
                <Card className="photo-prompt-content-tab__empty">
                  <Text color="muted">{STRINGS.PHOTO_PROMPT_ADMIN_EMPTY}</Text>
                  <div className="photo-prompt-content-tab__create-action">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={openCreateForm}
                    >
                      {STRINGS.PHOTO_PROMPT_ADMIN_CREATE}
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
