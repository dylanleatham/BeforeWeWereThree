import { useState, useCallback, useRef, useEffect } from 'react';

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
    if (pin.length !== 8 || isLoading) return;

    setError(null);
    const result = await onSubmit(pin);

    if (!result.success) {
      // Wrong PIN: shake animation + clear input + show message
      setIsShaking(true);
      setError(result.error ?? "Hmm, that's not it. Try again?");
      setPin('');

      // Remove shake after animation
      setTimeout(() => {
        setIsShaking(false);
        inputRef.current?.focus();
      }, 500);
    }
  }, [pin, isLoading, onSubmit]);

  // Auto-submit when 8 digits entered
  useEffect(() => {
    if (pin.length === 8 && !isLoading) {
      handleSubmit();
    }
  }, [pin, isLoading, handleSubmit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 8) {
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
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Welcome message */}
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome</h1>
          <p style={styles.subtitle}>Enter your special date to begin</p>
        </div>

        {/* PIN Input */}
        <div
          style={styles.inputWrapper}
          className={isShaking ? 'shake-animation' : ''}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formatPinDisplay(pin)}
            onChange={handleChange}
            placeholder="MM/DD/YYYY"
            disabled={isLoading}
            style={styles.input}
            maxLength={10} // Account for slashes in display
            aria-label="Enter PIN in date format"
          />
        </div>

        {/* Error message */}
        {error && <p style={styles.error}>{error}</p>}

        {/* Loading indicator */}
        {isLoading && <p style={styles.loading}>...</p>}

        {/* Progress dots */}
        <div style={styles.dots}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                backgroundColor: i < pin.length ? '#F4A261' : '#E0D8D0',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Styles object
 * Warm, intimate design per CONTEXT.md
 * Using inline styles for now - Phase 2 will add full design system
 */
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #FAF3E8 0%, #FFF8F0 100%)',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '3rem 2rem',
    maxWidth: '360px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
    textAlign: 'center' as const,
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: '2rem',
    fontWeight: '500',
    color: '#3D3D3D',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '1rem',
    color: '#6B6B6B',
    margin: 0,
  },
  inputWrapper: {
    marginBottom: '1rem',
  },
  input: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.5rem',
    fontFamily: 'monospace',
    textAlign: 'center' as const,
    border: '2px solid #E0D8D0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: '#FAFAFA',
    color: '#3D3D3D',
    letterSpacing: '0.1em',
    boxSizing: 'border-box' as const,
  },
  error: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '0.9rem',
    color: '#E07A5F',
    margin: '0 0 1rem 0',
  },
  loading: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '1rem',
    color: '#9B9B9B',
    margin: '0 0 1rem 0',
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '1.5rem',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'background-color 0.2s ease',
  },
  // Shake animation will be handled by CSS below
  shake: {},
};

// Add CSS for shake animation via style tag (temporary until Phase 2 design system)
if (typeof document !== 'undefined') {
  const styleId = 'pin-entry-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
        20%, 40%, 60%, 80% { transform: translateX(8px); }
      }

      .shake-animation {
        animation: shake 0.5s ease-in-out;
      }

      input:focus {
        border-color: #F4A261 !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}
