import { useState, useEffect, useCallback, useRef } from 'react';
import type { GenderRevealAdminResponse, Envelope } from 'shared';
import { Button, Card, Text } from '../common';
import {
  getGenderRevealAdminConfig,
  configureGenderReveal,
  resealGenderReveal,
  deleteGenderRevealConfig,
  getEnvelopes,
} from '../../services/api';
import { STRINGS } from '../../constants/strings';
import { PIN_LENGTH, PIN_DISPLAY_MAX_LENGTH } from '../../constants/config';
import './GenderRevealContentTab.css';

/** Format 8-digit date string as MM/DD/YYYY for display */
function formatDateDisplay(value: string): string {
  if (value.length <= 2) return value;
  if (value.length <= 4) return `${value.slice(0, 2)}/${value.slice(2)}`;
  return `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
}

/**
 * Admin content tab for configuring gender reveal envelopes.
 * Provides full CRUD: configure gender + two unique dates, view status,
 * re-seal revealed envelopes, and delete configuration entirely.
 *
 * Dates are displayed in plain text for the admin to share manually
 * (text, whisper, physical card). The app does NOT send dates to participants.
 */
export function GenderRevealContentTab() {
  const [revealEnvelopes, setRevealEnvelopes] = useState<Envelope[]>([]);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);
  const [config, setConfig] = useState<GenderRevealAdminResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state — stored as raw digits (e.g., "01152026")
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

  // Load gender reveal envelopes (auto-select if only one exists)
  useEffect(() => {
    async function loadEnvelopes() {
      try {
        const envelopes = await getEnvelopes();
        if (mountedRef.current) {
          const reveals = envelopes.filter((e) => e.type === 'gender-reveal');
          setRevealEnvelopes(reveals);
          const firstReveal = reveals[0];
          if (reveals.length === 1 && firstReveal && !selectedEnvelopeId) {
            setSelectedEnvelopeId(firstReveal.id);
          }
        }
      } catch {
        // Silent error
      }
    }
    loadEnvelopes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      setKeyA(prefill.keyA ?? '');
      setKeyB(prefill.keyB ?? '');
    } else {
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

  /** Handle date input — strip non-digits, limit to PIN_LENGTH */
  const handleDateInput = useCallback(
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
      setter(digits);
      setFormError(null);
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    if (keyA.length !== PIN_LENGTH) {
      setFormError('Date A must be 8 digits (MM/DD/YYYY)');
      return false;
    }
    if (keyB.length !== PIN_LENGTH) {
      setFormError('Date B must be 8 digits (MM/DD/YYYY)');
      return false;
    }
    if (keyA === keyB) {
      setFormError('Dates must be different');
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
  }, [selectedEnvelopeId, keyA, keyB, validateForm, loadConfig]);

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
            {/* Date A */}
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
                inputMode="numeric"
                className="gender-reveal-tab__input"
                value={formatDateDisplay(keyA)}
                onChange={handleDateInput(setKeyA)}
                placeholder="MM/DD/YYYY"
                maxLength={PIN_DISPLAY_MAX_LENGTH}
              />
              <span className="gender-reveal-tab__hint">
                {STRINGS.REVEAL_ADMIN_KEY_HINT}
              </span>
            </div>

            {/* Date B */}
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
                inputMode="numeric"
                className="gender-reveal-tab__input"
                value={formatDateDisplay(keyB)}
                onChange={handleDateInput(setKeyB)}
                placeholder="MM/DD/YYYY"
                maxLength={PIN_DISPLAY_MAX_LENGTH}
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
                disabled={isSaving || keyA.length !== PIN_LENGTH || keyB.length !== PIN_LENGTH}
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
                          No configuration yet. Set up the gender and dates.
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
                            Gender
                          </span>
                          <span className="gender-reveal-tab__config-value">
                            {config.genderSet
                              ? STRINGS.REVEAL_ADMIN_GENDER_SET
                              : STRINGS.REVEAL_ADMIN_GENDER_NOT_SET}
                          </span>
                        </div>
                        <div className="gender-reveal-tab__config-row">
                          <span className="gender-reveal-tab__config-label">
                            {STRINGS.REVEAL_ADMIN_KEY_A_LABEL}
                          </span>
                          <span className="gender-reveal-tab__key-display">
                            {config.keyA ? formatDateDisplay(config.keyA) : ''}
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
                            {config.keyB ? formatDateDisplay(config.keyB) : ''}
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
