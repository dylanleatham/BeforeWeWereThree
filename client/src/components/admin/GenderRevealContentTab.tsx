import { useState, useEffect, useCallback, useRef } from 'react';
import type { GenderRevealAdminResponse, GenderValue, Envelope } from 'shared';
import { Button, Card, Text } from '../common';
import {
  getGenderRevealAdminConfig,
  configureGenderReveal,
  resealGenderReveal,
  deleteGenderRevealConfig,
  getEnvelopes,
} from '../../services/api';
import { STRINGS } from '../../constants/strings';
import './GenderRevealContentTab.css';

/**
 * Admin content tab for configuring gender reveal envelopes.
 * Provides full CRUD: configure gender + two unique keys, view status,
 * re-seal revealed envelopes, and delete configuration entirely.
 *
 * Keys are displayed in plain text for the admin to share manually
 * (text, whisper, physical card). The app does NOT send keys to participants.
 */
export function GenderRevealContentTab() {
  const [revealEnvelopes, setRevealEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);
  const [config, setConfig] = useState<GenderRevealAdminResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [genderValue, setGenderValue] = useState<GenderValue>('boy');
  const [keyA, setKeyA] = useState('');
  const [keyB, setKeyB] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<'reseal' | 'delete' | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load gender reveal envelopes
  useEffect(() => {
    async function loadEnvelopes() {
      try {
        const envelopes = await getEnvelopes();
        if (mountedRef.current) {
          setRevealEnvelopes(envelopes.filter((e) => e.type === 'gender-reveal'));
        }
      } catch {
        // Silent error
      }
    }
    loadEnvelopes();
  }, []);

  const loadConfig = useCallback(async (envelopeId: string) => {
    setIsLoading(true);
    try {
      const data = await getGenderRevealAdminConfig(envelopeId);
      if (mountedRef.current) {
        setConfig(data);
      }
    } catch {
      if (mountedRef.current) {
        setConfig(null);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load config when envelope selection changes
  useEffect(() => {
    if (selectedEnvelopeId) {
      loadConfig(selectedEnvelopeId);
      setIsEditing(false);
      setConfirmAction(null);
    } else {
      setConfig(null);
      setIsEditing(false);
      setConfirmAction(null);
    }
  }, [selectedEnvelopeId, loadConfig]);

  const openForm = useCallback((prefill?: GenderRevealAdminResponse) => {
    if (prefill?.configured) {
      setGenderValue(prefill.genderValue ?? 'boy');
      setKeyA(prefill.keyA ?? '');
      setKeyB(prefill.keyB ?? '');
    } else {
      setGenderValue('boy');
      setKeyA('');
      setKeyB('');
    }
    setFormError(null);
    setIsEditing(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsEditing(false);
    setFormError(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;

    if (keyA.length < 6 || keyA.length > 8) {
      setFormError('Key A must be 6-8 characters');
      return false;
    }
    if (!alphanumericRegex.test(keyA)) {
      setFormError('Key A must be alphanumeric');
      return false;
    }
    if (keyB.length < 6 || keyB.length > 8) {
      setFormError('Key B must be 6-8 characters');
      return false;
    }
    if (!alphanumericRegex.test(keyB)) {
      setFormError('Key B must be alphanumeric');
      return false;
    }
    if (keyA === keyB) {
      setFormError('Keys must be different');
      return false;
    }

    setFormError(null);
    return true;
  }, [keyA, keyB]);

  const handleSave = useCallback(async () => {
    if (!selectedEnvelopeId) return;
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await configureGenderReveal(selectedEnvelopeId, {
        genderValue,
        keyA,
        keyB,
      });
      await loadConfig(selectedEnvelopeId);
      setIsEditing(false);
    } catch (error) {
      if (mountedRef.current) {
        setFormError(error instanceof Error ? error.message : 'Failed to save');
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [selectedEnvelopeId, genderValue, keyA, keyB, validateForm, loadConfig]);

  const handleReseal = useCallback(async () => {
    if (!selectedEnvelopeId) return;

    setIsSaving(true);
    try {
      await resealGenderReveal(selectedEnvelopeId);
      await loadConfig(selectedEnvelopeId);
      setConfirmAction(null);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [selectedEnvelopeId, loadConfig]);

  const handleDelete = useCallback(async () => {
    if (!selectedEnvelopeId) return;

    setIsSaving(true);
    try {
      await deleteGenderRevealConfig(selectedEnvelopeId);
      if (mountedRef.current) {
        setConfig(null);
        setConfirmAction(null);
        setIsEditing(false);
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [selectedEnvelopeId]);

  // Derive status from config
  const getStatus = (): 'not-configured' | 'configured' | 'revealed' => {
    if (!config?.configured) return 'not-configured';
    if (config.revealedAt) return 'revealed';
    return 'configured';
  };

  const status = config ? getStatus() : 'not-configured';

  // Render form
  if (isEditing) {
    return (
      <div className="gender-reveal-tab">
        <h3 className="gender-reveal-tab__heading">
          {STRINGS.REVEAL_ADMIN_HEADING}
        </h3>
        <Card className="gender-reveal-tab__card">
          <div className="gender-reveal-tab__form">
            {/* Gender selection */}
            <div className="gender-reveal-tab__field">
              <label className="gender-reveal-tab__label">
                {STRINGS.REVEAL_ADMIN_GENDER_LABEL}
              </label>
              <div className="gender-reveal-tab__gender-toggle">
                <button
                  type="button"
                  className={`gender-reveal-tab__gender-option ${genderValue === 'boy' ? 'gender-reveal-tab__gender-option--active-boy' : ''}`}
                  onClick={() => setGenderValue('boy')}
                  aria-pressed={genderValue === 'boy'}
                >
                  Boy
                </button>
                <button
                  type="button"
                  className={`gender-reveal-tab__gender-option ${genderValue === 'girl' ? 'gender-reveal-tab__gender-option--active-girl' : ''}`}
                  onClick={() => setGenderValue('girl')}
                  aria-pressed={genderValue === 'girl'}
                >
                  Girl
                </button>
              </div>
            </div>

            {/* Key A */}
            <div className="gender-reveal-tab__field">
              <label
                htmlFor="reveal-key-a"
                className="gender-reveal-tab__label"
              >
                {STRINGS.REVEAL_ADMIN_KEY_A_LABEL}
              </label>
              <input
                id="reveal-key-a"
                type="text"
                className="gender-reveal-tab__input"
                value={keyA}
                onChange={(e) => {
                  setKeyA(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g., BABY01"
                minLength={6}
                maxLength={8}
              />
              <span className="gender-reveal-tab__hint">
                {STRINGS.REVEAL_ADMIN_KEY_HINT}
              </span>
            </div>

            {/* Key B */}
            <div className="gender-reveal-tab__field">
              <label
                htmlFor="reveal-key-b"
                className="gender-reveal-tab__label"
              >
                {STRINGS.REVEAL_ADMIN_KEY_B_LABEL}
              </label>
              <input
                id="reveal-key-b"
                type="text"
                className="gender-reveal-tab__input"
                value={keyB}
                onChange={(e) => {
                  setKeyB(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g., LOVE02"
                minLength={6}
                maxLength={8}
              />
              <span className="gender-reveal-tab__hint">
                {STRINGS.REVEAL_ADMIN_KEY_HINT}
              </span>
            </div>

            {/* Form error */}
            {formError && (
              <div className="gender-reveal-tab__error" role="alert">
                {formError}
              </div>
            )}

            {/* Actions */}
            <div className="gender-reveal-tab__form-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={closeForm}
                disabled={isSaving}
              >
                {STRINGS.REVEAL_ADMIN_CANCEL}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !keyA || !keyB}
              >
                {isSaving ? STRINGS.REVEAL_ADMIN_SAVING : STRINGS.REVEAL_ADMIN_SAVE}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Render confirmation dialog
  if (confirmAction) {
    const isReseal = confirmAction === 'reseal';
    return (
      <div className="gender-reveal-tab">
        <h3 className="gender-reveal-tab__heading">
          {STRINGS.REVEAL_ADMIN_HEADING}
        </h3>
        <Card className="gender-reveal-tab__card">
          <div className="gender-reveal-tab__confirm">
            <p className="gender-reveal-tab__confirm-text">
              {isReseal
                ? STRINGS.REVEAL_ADMIN_RESEAL_CONFIRM
                : STRINGS.REVEAL_ADMIN_DELETE_CONFIRM}
            </p>
            <div className="gender-reveal-tab__confirm-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmAction(null)}
                disabled={isSaving}
              >
                {STRINGS.REVEAL_ADMIN_CANCEL}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={isReseal ? handleReseal : handleDelete}
                disabled={isSaving}
              >
                {isSaving
                  ? (isReseal ? 'Re-sealing...' : 'Deleting...')
                  : (isReseal ? STRINGS.REVEAL_ADMIN_RESEAL : STRINGS.REVEAL_ADMIN_DELETE)}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Main display
  return (
    <div className="gender-reveal-tab">
      <h3 className="gender-reveal-tab__heading">
        {STRINGS.REVEAL_ADMIN_HEADING}
      </h3>

      {revealEnvelopes.length === 0 ? (
        <Text color="muted">
          No Gender Reveal envelopes exist. Create one in Envelope Management above.
        </Text>
      ) : (
        <>
          {/* Envelope selector */}
          <div className="gender-reveal-tab__envelope-select">
            <label
              htmlFor="gender-reveal-envelope-select"
              className="gender-reveal-tab__select-label"
            >
              {STRINGS.REVEAL_ADMIN_SELECT_ENVELOPE}
            </label>
            <select
              id="gender-reveal-envelope-select"
              className="gender-reveal-tab__select"
              value={selectedEnvelopeId ?? ''}
              onChange={(e) => setSelectedEnvelopeId(e.target.value || null)}
            >
              <option value="">Choose an envelope...</option>
              {revealEnvelopes.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.title}
                </option>
              ))}
            </select>
          </div>

          {selectedEnvelopeId && (
            <>
              {isLoading ? (
                <div className="gender-reveal-tab__loading">
                  <Text color="muted">Loading configuration...</Text>
                </div>
              ) : (
                <>
                  {/* Status badge */}
                  <div className={`gender-reveal-tab__status gender-reveal-tab__status--${status}`}>
                    {status === 'not-configured' && STRINGS.REVEAL_ADMIN_STATUS_NOT_CONFIGURED}
                    {status === 'configured' && STRINGS.REVEAL_ADMIN_STATUS_CONFIGURED}
                    {status === 'revealed' && STRINGS.REVEAL_ADMIN_STATUS_REVEALED}
                  </div>

                  {/* Not configured state */}
                  {status === 'not-configured' && (
                    <Card className="gender-reveal-tab__card">
                      <div className="gender-reveal-tab__empty">
                        <Text color="muted">
                          No configuration yet. Set up the gender and keys.
                        </Text>
                        <div className="gender-reveal-tab__empty-action">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openForm()}
                          >
                            Configure
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Configured or revealed state */}
                  {(status === 'configured' || status === 'revealed') && config && (
                    <Card className="gender-reveal-tab__card">
                      <div className="gender-reveal-tab__config-display">
                        <div className="gender-reveal-tab__config-row">
                          <span className="gender-reveal-tab__config-label">
                            {STRINGS.REVEAL_ADMIN_GENDER_LABEL}
                          </span>
                          <span className="gender-reveal-tab__config-value">
                            {config.genderValue === 'boy' ? 'Boy' : 'Girl'}
                          </span>
                        </div>
                        <div className="gender-reveal-tab__config-row">
                          <span className="gender-reveal-tab__config-label">
                            {STRINGS.REVEAL_ADMIN_KEY_A_LABEL}
                          </span>
                          <span className="gender-reveal-tab__key-display">
                            {config.keyA}
                          </span>
                          {config.keyAValidated && (
                            <span className="gender-reveal-tab__validated-badge">
                              Entered
                            </span>
                          )}
                        </div>
                        <div className="gender-reveal-tab__config-row">
                          <span className="gender-reveal-tab__config-label">
                            {STRINGS.REVEAL_ADMIN_KEY_B_LABEL}
                          </span>
                          <span className="gender-reveal-tab__key-display">
                            {config.keyB}
                          </span>
                          {config.keyBValidated && (
                            <span className="gender-reveal-tab__validated-badge">
                              Entered
                            </span>
                          )}
                        </div>
                        {config.revealedAt && (
                          <div className="gender-reveal-tab__config-row">
                            <span className="gender-reveal-tab__config-label">
                              Revealed
                            </span>
                            <span className="gender-reveal-tab__config-value">
                              {new Date(config.revealedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="gender-reveal-tab__actions">
                        {!config.revealedAt && (
                          <button
                            className="gender-reveal-tab__btn"
                            onClick={() => openForm(config)}
                            disabled={isSaving}
                          >
                            Edit
                          </button>
                        )}
                        {(config.keyAValidated || config.keyBValidated) && (
                          <button
                            className="gender-reveal-tab__btn"
                            onClick={() => setConfirmAction('reseal')}
                            disabled={isSaving}
                          >
                            {STRINGS.REVEAL_ADMIN_RESEAL}
                          </button>
                        )}
                        <button
                          className="gender-reveal-tab__btn gender-reveal-tab__btn--danger"
                          onClick={() => setConfirmAction('delete')}
                          disabled={isSaving}
                        >
                          {STRINGS.REVEAL_ADMIN_DELETE}
                        </button>
                      </div>
                    </Card>
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
