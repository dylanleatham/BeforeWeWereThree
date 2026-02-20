import { MotionConfig } from 'motion/react';
import { useSession } from './hooks/useSession';
import { useEnvelopes } from './hooks/useEnvelopes';
import { PinEntry } from './components/auth/PinEntry';
import { EnvelopePile } from './components/envelope';
import { EnvelopeManager, ContentManager } from './components/admin';
import { FriendDashboard } from './components/friend/FriendDashboard';
import { Heading, Text, SpotifyButton } from './components/common';
import { SignalRProvider } from './context/SignalRContext';
import { STRINGS } from './constants/strings';
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

  // Not authenticated: show PIN entry
  if (!isAuthenticated) {
    return <PinEntry onSubmit={login} isLoading={sessionLoading} />;
  }

  // Friend role: no SignalR needed, render FriendDashboard directly
  if (role === 'friend') {
    return <FriendDashboard />;
  }

  // Authenticated (guest/admin): show main app wrapped in SignalR provider
  return (
    <SignalRProvider>
      <AuthenticatedApp
        role={role}
        designation={designation}
        sessionLoading={sessionLoading}
      />
    </SignalRProvider>
  );
}

/**
 * Authenticated App View
 * Separated to ensure useEnvelopes only runs when authenticated
 */
function AuthenticatedApp({
  role,
  designation,
  sessionLoading,
}: {
  role: string | null;
  designation: string | null;
  sessionLoading: boolean;
}) {
  const {
    envelopes,
    isLoading: envelopesLoading,
    error: envelopesError,
    refetch,
    updateStatus,
  } = useEnvelopes();

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
            <span className="app__admin-badge">{STRINGS.APP_ADMIN_BADGE}</span>
          </header>
          <main className="app__main">
            <EnvelopeManager
              envelopes={envelopes}
              onRefresh={refetch}
              isLoading={envelopesLoading}
            />
            <ContentManager />
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
            {STRINGS.APP_TITLE}
          </Heading>
          {designation === 'readonly' && (
            <Text variant="small" color="muted" className="app__readonly">
              {STRINGS.APP_READONLY}
            </Text>
          )}
        </header>

        <main className="app__main">
          {envelopesLoading && envelopes.length === 0 ? (
            <div className="app__loading-envelopes">
              <Text color="muted">{STRINGS.APP_LOADING_ENVELOPES}</Text>
            </div>
          ) : envelopesError ? (
            <div className="app__error">
              <Text color="muted">
                {envelopesError.message || STRINGS.APP_ERROR_FALLBACK}
              </Text>
              <button onClick={refetch} className="app__retry">
                {STRINGS.APP_RETRY}
              </button>
            </div>
          ) : envelopes.length === 0 ? (
            <div className="app__empty">
              <Heading level={2}>{STRINGS.APP_EMPTY_TITLE}</Heading>
              <Text color="muted">
                {STRINGS.APP_EMPTY_MESSAGE}
              </Text>
            </div>
          ) : (
            <EnvelopePile
              envelopes={envelopes}
              onStatusChange={(id, status) => updateStatus(id, status)}
            />
          )}
        </main>

        {/* Floating Spotify button (visible when URL configured) */}
        <SpotifyButton />
      </div>
    </MotionConfig>
  );
}

export default App;
