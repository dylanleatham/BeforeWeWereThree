import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { STRINGS } from '../../../constants/strings';
import './KeyEntryPhase.css';

interface KeyEntryPhaseProps {
  /** Called when the key is fully entered */
  onSubmit: (key: string) => void;
  /** Whether a validation request is in-flight */
  isSubmitting: boolean;
  /** Error message from validation (null if no error) */
  error: string | null;
  /** Expected key length (determines number of boxes) */
  keyLength: number;
}

/**
 * Segmented code input for the gender reveal key
 *
 * Uses hidden input technique for accessibility:
 * - Single hidden <input> handles all text entry, paste, and keyboard events
 * - Visual character boxes are purely presentational (aria-hidden)
 * - Auto-submits when keyLength characters are entered
 * - Error state triggers shake animation and clears input
 *
 * The ceremonial styling makes each character feel intentional,
 * building anticipation toward the reveal.
 */
export function KeyEntryPhase({
  onSubmit,
  isSubmitting,
  error,
  keyLength,
}: KeyEntryPhaseProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip non-alphanumeric and limit to keyLength
      const cleaned = e.target.value
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, keyLength);
      setValue(cleaned);

      // Auto-submit when fully entered
      if (cleaned.length === keyLength) {
        onSubmit(cleaned);
      }
    },
    [keyLength, onSubmit]
  );

  const handleBoxClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // When a new error arrives, clear the input after shake animation completes
  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setValue('');
      inputRef.current?.focus();
    }, 400);

    return () => clearTimeout(timer);
  }, [error]);

  // Use the error string as key so motion.div remounts on each new error,
  // re-triggering the shake initial animation
  const boxesKey = error ?? 'idle';

  return (
    <div className="key-entry">
      <h2 className="key-entry__title">{STRINGS.REVEAL_KEY_ENTRY_TITLE}</h2>
      <p className="key-entry__subtitle">{STRINGS.REVEAL_KEY_ENTRY_SUBTITLE}</p>

      {/* Hidden input for actual text entry */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="one-time-code"
        value={value}
        onChange={handleChange}
        className="key-entry__hidden-input"
        aria-label={STRINGS.REVEAL_KEY_ENTRY_ARIA}
        disabled={isSubmitting}
        autoFocus
      />

      {/* Visual character boxes -- key on error to remount for shake animation */}
      <motion.div
        className="key-entry__boxes"
        onClick={handleBoxClick}
        aria-hidden="true"
        key={boxesKey}
        initial={error ? { x: 0 } : undefined}
        animate={error ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
        transition={error ? { duration: 0.4 } : undefined}
      >
        {Array.from({ length: keyLength }).map((_, i) => {
          const char = value[i];
          const isActive = i === value.length && !isSubmitting;
          const isFilled = Boolean(char);

          return (
            <motion.div
              key={i}
              className={`key-entry__box${isFilled ? ' key-entry__box--filled' : ''}${
                isActive ? ' key-entry__box--active' : ''
              }`}
              animate={isFilled ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {char ?? ''}
            </motion.div>
          );
        })}
      </motion.div>

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
          Checking...
        </p>
      )}
    </div>
  );
}
