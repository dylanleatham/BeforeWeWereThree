import { useSession } from './hooks/useSession';
import { PinEntry } from './components/auth/PinEntry';

/**
 * Main App Component
 * Handles authentication gate and routes to appropriate experience
 *
 * Per CONTEXT.md:
 * - Guest: main participant experience (placeholder for now)
 * - Admin: configuration dashboard (placeholder for now)
 * - Subtle admin indicator
 */

function App() {
  const { isLoading, isAuthenticated, role, designation, login } = useSession();

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  // Not authenticated: show PIN entry
  if (!isAuthenticated) {
    return <PinEntry onSubmit={login} />;
  }

  // Admin: show admin dashboard placeholder
  if (role === 'admin') {
    return (
      <div style={styles.container}>
        <div style={styles.adminIndicator}>Admin Mode</div>
        <div style={styles.content}>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>Configuration and envelope management</p>
          <div style={styles.placeholder}>
            <p>Coming in Phase 2:</p>
            <ul style={styles.list}>
              <li>Envelope management</li>
              <li>Activity configuration</li>
              <li>Participant settings</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Guest: show participant welcome
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Welcome, Participant!</h1>
        <p style={styles.subtitle}>Your babymoon adventure awaits</p>
        {designation === 'readonly' && (
          <p style={styles.readonlyNotice}>
            You're in viewing mode. The main experience is designed for two.
          </p>
        )}
        <div style={styles.placeholder}>
          <p>Coming in Phase 2:</p>
          <ul style={styles.list}>
            <li>Envelope selection</li>
            <li>Activities and games</li>
            <li>Letters and memories</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Styles
 * Warm, intimate design per CONTEXT.md
 */
const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #FAF3E8 0%, #FFF8F0 100%)',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #E0D8D0',
    borderTopColor: '#F4A261',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #FAF3E8 0%, #FFF8F0 100%)',
    padding: '2rem',
    position: 'relative' as const,
  },
  adminIndicator: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(188, 108, 74, 0.1)',
    color: '#BC6C4A',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '500',
  },
  content: {
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center' as const,
    paddingTop: '4rem',
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: '2.5rem',
    fontWeight: '500',
    color: '#3D3D3D',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '1.1rem',
    color: '#6B6B6B',
    margin: '0 0 2rem 0',
  },
  readonlyNotice: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: '0.95rem',
    color: '#9DB5A0',
    margin: '0 0 2rem 0',
    fontStyle: 'italic',
  },
  placeholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'left' as const,
    fontFamily: 'system-ui, sans-serif',
  },
  list: {
    margin: '1rem 0 0 0',
    paddingLeft: '1.5rem',
    color: '#6B6B6B',
    lineHeight: 1.8,
  },
};

// Add spin animation for loading spinner
if (typeof document !== 'undefined') {
  const styleId = 'app-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default App;
