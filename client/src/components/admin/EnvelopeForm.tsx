import { useState, useCallback, FormEvent } from 'react';
import type { Envelope, CreateEnvelopeRequest, EnvelopeType } from 'shared';
import { Button } from '../common';
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
}

const ENVELOPE_TYPES: { value: EnvelopeType; label: string }[] = [
  { value: 'would-you-rather', label: 'Would You Rather' },
  { value: 'letter', label: 'Letter to Baby' },
  { value: 'trivia', label: 'Trivia' },
  { value: 'name-game', label: 'Name Game' },
  { value: 'gender-reveal', label: 'Gender Reveal' },
];

/**
 * Form for creating or editing an envelope
 * Admin only - per ADMIN-05
 */
export function EnvelopeForm({
  envelope,
  onSubmit,
  onCancel,
  isLoading = false,
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
        setError('Title is required');
        return;
      }

      const orderNum = parseInt(order, 10);
      if (isNaN(orderNum) || orderNum < 0) {
        setError('Order must be a non-negative number');
        return;
      }

      try {
        await onSubmit({
          title: title.trim(),
          type,
          order: orderNum,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save envelope');
      }
    },
    [title, type, order, onSubmit]
  );

  return (
    <form className="envelope-form" onSubmit={handleSubmit}>
      <h3 className="envelope-form__title">
        {isEditing ? 'Edit Envelope' : 'Create Envelope'}
      </h3>

      {error && (
        <div className="envelope-form__error" role="alert">
          {error}
        </div>
      )}

      <div className="envelope-form__field">
        <label htmlFor="envelope-title" className="envelope-form__label">
          Title
        </label>
        <input
          id="envelope-title"
          type="text"
          className="envelope-form__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Would You Rather #1"
          maxLength={100}
          disabled={isLoading}
          autoFocus
        />
      </div>

      <div className="envelope-form__field">
        <label htmlFor="envelope-type" className="envelope-form__label">
          Activity Type
        </label>
        <select
          id="envelope-type"
          className="envelope-form__select"
          value={type}
          onChange={(e) => setType(e.target.value as EnvelopeType)}
          disabled={isLoading}
        >
          {ENVELOPE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="envelope-form__field">
        <label htmlFor="envelope-order" className="envelope-form__label">
          Display Order
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
          Lower numbers appear first in the pile
        </p>
      </div>

      <div className="envelope-form__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Envelope'}
        </Button>
      </div>
    </form>
  );
}
