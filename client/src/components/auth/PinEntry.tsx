import { useState, useCallback, useRef, useEffect } from 'react';
import { STRINGS } from '../../constants/strings';
import { PIN_LENGTH, PIN_DISPLAY_MAX_LENGTH } from '../../constants/config';
import { ANIMATION_DURATION_MS } from '../../constants/animation';
import './PinEntry.css';

/**
 * PIN Entry Component
 * Warm, welcoming design for entering 8-digit date-based PIN
 * Per CONTEXT.md: "Entering a special space" feel, intimate not corporate
 */

interface PinEntryProps {
  onSubmit: (pin: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

export function PinEntry({ onSubmit, isLoading = false }: PinEntryProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== PIN_LENGTH || isLoading) return;

    setError(null);
    const result = await onSubmit(pin);

    if (!result.success) {
      // Wrong PIN: shake animation + clear input + show message
      setIsShaking(true);
      setError(result.error ?? STRINGS.PIN_ERROR_FALLBACK);
      setPin('');

      // Remove shake after animation
      setTimeout(() => {
        setIsShaking(false);
        inputRef.current?.focus();
      }, ANIMATION_DURATION_MS);
    }
  }, [pin, isLoading, onSubmit]);

  // Auto-submit when all digits entered (intentional UX pattern)
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleSubmit();
    }
  }, [pin, isLoading, handleSubmit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= PIN_LENGTH) {
      setPin(value);
      setError(null);
    }
  }, []);

  // Format PIN for display (MM/DD/YYYY)
  const formatPinDisplay = (value: string): string => {
    if (value.length <= 2) return value;
    if (value.length <= 4) return `${value.slice(0, 2)}/${value.slice(2)}`;
    return `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
  };

  return (
    <div className="pin-entry">
      <div className="pin-entry__card">
        {/* Welcome message */}
        <div className="pin-entry__header">
          <h1 className="pin-entry__title">{STRINGS.PIN_TITLE}</h1>
          <p className="pin-entry__subtitle">{STRINGS.PIN_SUBTITLE}</p>
        </div>

        {/* PIN Input */}
        <div
          className={`pin-entry__input-wrapper${isShaking ? ' pin-entry__input-wrapper--shaking' : ''}`}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formatPinDisplay(pin)}
            onChange={handleChange}
            placeholder={STRINGS.PIN_PLACEHOLDER}
            disabled={isLoading}
            className="pin-entry__input"
            maxLength={PIN_DISPLAY_MAX_LENGTH}
            aria-label={STRINGS.PIN_ARIA_LABEL}
          />
        </div>

        {/* Error message */}
        {error && <p className="pin-entry__error">{error}</p>}

        {/* Loading indicator */}
        {isLoading && <p className="pin-entry__loading">{STRINGS.PIN_LOADING}</p>}

        {/* Progress dots */}
        <div className="pin-entry__dots">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`pin-entry__dot${i < pin.length ? ' pin-entry__dot--filled' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
