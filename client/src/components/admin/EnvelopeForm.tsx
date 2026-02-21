import { useState, useCallback, FormEvent } from 'react';
import type { Envelope, CreateEnvelopeRequest, EnvelopeType } from 'shared';
import { Button } from '../common';
import { STRINGS, ENVELOPE_TYPES } from '../../constants/strings';
import { ENVELOPE_TITLE_MAX_LENGTH } from '../../constants/config';
import './EnvelopeForm.css';

interface EnvelopeFormProps {
  /** Existing envelope to edit, or undefined for create */
  envelope?: Envelope;
  /** Called on form submit */
  onSubmit: (data: CreateEnvelopeRequest) => Promise<void>;
  /** Called to cancel/close form */
  onCancel: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Envelope types that should be disabled in the type selector */
  disabledTypes?: string[];
}

/**
 * Form for creating or editing an envelope
 * Admin only - per ADMIN-05
 */
export function EnvelopeForm({
  envelope,
  onSubmit,
  onCancel,
  isLoading = false,
  disabledTypes = [],
}: EnvelopeFormProps) {
  const [title, setTitle] = useState(envelope?.title || '');
  const [type, setType] = useState<EnvelopeType>(envelope?.type || 'would-you-rather');
  const [order, setOrder] = useState(envelope?.order?.toString() || '0');
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!envelope;

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      // Basic validation
      if (!title.trim()) {
        setError(STRINGS.FORM_ERROR_TITLE_REQUIRED);
        return;
      }

      const orderNum = parseInt(order, 10);
      if (isNaN(orderNum) || orderNum < 0) {
        setError(STRINGS.FORM_ERROR_ORDER_INVALID);
        return;
      }

      try {
        await onSubmit({
          title: title.trim(),
          type,
          order: orderNum,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : STRINGS.FORM_ERROR_SAVE_FALLBACK);
      }
    },
    [title, type, order, onSubmit]
  );

  return (
    <form className="envelope-form" onSubmit={handleSubmit}>
      <h3 className="envelope-form__title">
        {isEditing ? STRINGS.FORM_TITLE_EDIT : STRINGS.FORM_TITLE_CREATE}
      </h3>

      {error && (
        <div className="envelope-form__error" role="alert">
          {error}
        </div>
      )}

      <div className="envelope-form__field">
        <label htmlFor="envelope-title" className="envelope-form__label">
          {STRINGS.FORM_LABEL_TITLE}
        </label>
        <input
          id="envelope-title"
          type="text"
          className="envelope-form__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={STRINGS.FORM_PLACEHOLDER_TITLE}
          maxLength={ENVELOPE_TITLE_MAX_LENGTH}
          disabled={isLoading}
          autoFocus
        />
      </div>

      <div className="envelope-form__field">
        <label htmlFor="envelope-type" className="envelope-form__label">
          {STRINGS.FORM_LABEL_TYPE}
        </label>
        <select
          id="envelope-type"
          className="envelope-form__select"
          value={type}
          onChange={(e) => setType(e.target.value as EnvelopeType)}
          disabled={isLoading}
        >
          {ENVELOPE_TYPES.map((t) => (
            <option key={t.value} value={t.value} disabled={disabledTypes.includes(t.value)}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="envelope-form__field">
        <label htmlFor="envelope-order" className="envelope-form__label">
          {STRINGS.FORM_LABEL_ORDER}
        </label>
        <input
          id="envelope-order"
          type="number"
          className="envelope-form__input envelope-form__input--narrow"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          min="0"
          disabled={isLoading}
        />
        <p className="envelope-form__hint">
          {STRINGS.FORM_HINT_ORDER}
        </p>
      </div>

      <div className="envelope-form__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          {STRINGS.FORM_BUTTON_CANCEL}
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? STRINGS.FORM_BUTTON_SAVING : isEditing ? STRINGS.FORM_BUTTON_SAVE : STRINGS.FORM_BUTTON_CREATE}
        </Button>
      </div>
    </form>
  );
}
