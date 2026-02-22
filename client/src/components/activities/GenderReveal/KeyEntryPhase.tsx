import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import { PIN_LENGTH, PIN_DISPLAY_MAX_LENGTH } from '../../../constants/config';
import { ANIMATION_DURATION_MS } from '../../../constants/animation';
import './KeyEntryPhase.css';

interface KeyEntryPhaseProps {
  /** Called when the date is fully entered (8 digits) */
  onSubmit: (key: string) => void;
  /** Whether a validation request is in-flight */
  isSubmitting: boolean;
  /** Error message from validation (null if no error) */
  error: string | null;
  /** Expected key length (always 8 for date-based entry) */
  keyLength: number;
}

/**
 * Date-based input for the gender reveal key.
 *
 * Matches the app's PinEntry pattern:
 * - Single visible input with MM/DD/YYYY formatting
 * - Progress dots showing how many digits have been entered
 * - Auto-submits when 8 digits are entered
 * - Shake animation + clear on error
 *
 * The ceremonial styling makes each digit feel intentional,
 * building anticipation toward the reveal.
 */
export function KeyEntryPhase({
  onSubmit,
  isSubmitting,
  error,
}: KeyEntryPhaseProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // When a new error arrives, clear input after animation completes
  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setValue('');
      inputRef.current?.focus();
    }, ANIMATION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [error]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length <= PIN_LENGTH) {
      setValue(digits);
      // Auto-submit when all digits entered — fire from handler to avoid
      // effect timing issues (isSubmitting going false before value clears)
      if (digits.length === PIN_LENGTH && !isSubmitting) {
        onSubmit(digits);
      }
    }
  }, [isSubmitting, onSubmit]);

  // Format as MM/DD/YYYY
  const formatDateDisplay = (v: string): string => {
    if (v.length <= 2) return v;
    if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  };

  return (
    <div className="key-entry">
      <h2 className="key-entry__title">{STRINGS.REVEAL_KEY_ENTRY_TITLE}</h2>
      <p className="key-entry__subtitle">{STRINGS.REVEAL_KEY_ENTRY_SUBTITLE}</p>

      {/* Date input — key on error to remount and replay shake CSS animation */}
      <div
        key={error ?? 'idle'}
        className={`key-entry__input-wrapper${error ? ' key-entry__input-wrapper--shaking' : ''}`}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={formatDateDisplay(value)}
          onChange={handleChange}
          placeholder="MM/DD/YYYY"
          disabled={isSubmitting}
          className="key-entry__input"
          maxLength={PIN_DISPLAY_MAX_LENGTH}
          aria-label={STRINGS.REVEAL_KEY_ENTRY_ARIA}
        />
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          className="key-entry__error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          role="alert"
        >
          {error}
        </motion.p>
      )}

      {/* Submitting indicator */}
      {isSubmitting && (
        <p className="key-entry__submitting" aria-live="polite">
          {STRINGS.REVEAL_KEY_CHECKING}
        </p>
      )}

      {/* Progress dots */}
      <div className="key-entry__dots">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`key-entry__dot${i < value.length ? ' key-entry__dot--filled' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
