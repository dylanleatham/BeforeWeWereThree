import { MotionConfig } from 'motion/react';
import { useSession } from './hooks/useSession';
import { useEnvelopes } from './hooks/useEnvelopes';
import { PinEntry } from './components/auth/PinEntry';
import { EnvelopePile } from './components/envelope';
import { EnvelopeManager } from './components/admin';
import { Heading, Text } from './components/common';
import './styles/globals.css';

/**
 * Main App Component
 * Routes based on authentication and role:
 * - Not authenticated: PIN entry
 * - Guest: Envelope pile
 * - Admin: Envelope management
 */
function App() {
  const { isLoading: sessionLoading, isAuthenticated, role, designation, login } = useSession();
  const {
    envelopes,
    isLoading: envelopesLoading,
    error: envelopesError,
    refetch,
    updateStatus,
  } = useEnvelopes();

  // Not authenticated: show PIN entry
  if (!isAuthenticated) {
    return <PinEntry onSubmit={login} isLoading={sessionLoading} />;
  }

  // Loading state (checking session)
  if (sessionLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
      </div>
    );
  }

  // Admin view
  if (role === 'admin') {
    return (
      <MotionConfig reducedMotion="user">
        <div className="app app--admin">
          <header className="app__header">
            <span className="app__admin-badge">Admin Mode</span>
          </header>
          <main className="app__main">
            <EnvelopeManager
              envelopes={envelopes}
              onRefresh={refetch}
              isLoading={envelopesLoading}
            />
          </main>
        </div>
      </MotionConfig>
    );
  }

  // Guest view - envelope pile
  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <header className="app__header">
          <Heading level={1} className="app__title">
            Before We Were Three
          </Heading>
          {designation === 'readonly' && (
            <Text variant="small" color="muted" className="app__readonly">
              Viewing mode
            </Text>
          )}
        </header>

        <main className="app__main">
          {envelopesLoading && envelopes.length === 0 ? (
            <div className="app__loading-envelopes">
              <Text color="muted">Loading your envelopes...</Text>
            </div>
          ) : envelopesError ? (
            <div className="app__error">
              <Text color="muted">
                {envelopesError.message || 'Failed to load envelopes'}
              </Text>
              <button onClick={refetch} className="app__retry">
                Try again
              </button>
            </div>
          ) : envelopes.length === 0 ? (
            <div className="app__empty">
              <Heading level={2}>No envelopes yet</Heading>
              <Text color="muted">
                Ask your admin to add some activities!
              </Text>
            </div>
          ) : (
            <EnvelopePile
              envelopes={envelopes}
              onStatusChange={(id, status) => updateStatus(id, status)}
            />
          )}
        </main>
      </div>
    </MotionConfig>
  );
}

export default App;
