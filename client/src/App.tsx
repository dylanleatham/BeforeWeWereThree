import { useState, useMemo, useCallback } from 'react';
import { MotionConfig } from 'motion/react';
import { useSession } from './hooks/useSession';
import { useEnvelopes } from './hooks/useEnvelopes';
import { PinEntry } from './components/auth/PinEntry';
import { EnvelopePile } from './components/envelope';
import type { PileViewMode } from './components/envelope';
import { EnvelopeManager, ContentManager } from './components/admin';
import { FriendDashboard } from './components/friend/FriendDashboard';
import { Heading, Text, SpotifyButton, ContentTabs } from './components/common';
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

  const [activeTab, setActiveTab] = useState('activities');
  const [pileViewMode, setPileViewMode] = useState<PileViewMode>('stack');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setPileViewMode('stack');
  }, []);

  const handleHeadingClick = useCallback(() => {
    if (pileViewMode === 'list') {
      setPileViewMode('stack');
    }
  }, [pileViewMode]);

  const handleHeadingKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (pileViewMode === 'list' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setPileViewMode('stack');
      }
    },
    [pileViewMode]
  );

  const activityEnvelopes = useMemo(
    () => envelopes.filter((e) => e.type !== 'friend-letter'),
    [envelopes],
  );

  const friendLetterEnvelopes = useMemo(
    () => envelopes.filter((e) => e.type === 'friend-letter'),
    [envelopes],
  );

  const guestTabs = useMemo(() => [
    { id: 'activities', label: STRINGS.GUEST_TAB_ACTIVITIES },
    { id: 'friend-letters', label: STRINGS.GUEST_TAB_FRIEND_LETTERS },
  ], []);

  const visibleEnvelopes = activeTab === 'activities' ? activityEnvelopes : friendLetterEnvelopes;

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
        <header className={`app__header${pileViewMode === 'list' ? ' app__header--sticky' : ''}`}>
          <Heading
            level={1}
            className={`app__title${pileViewMode === 'list' ? ' app__title--clickable' : ''}`}
            {...(pileViewMode === 'list'
              ? {
                  onClick: handleHeadingClick,
                  onKeyDown: handleHeadingKeyDown,
                  role: 'button' as const,
                  tabIndex: 0,
                  'aria-label': STRINGS.PILE_COLLAPSE_ARIA,
                }
              : {})}
          >
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
            <>
              <ContentTabs
                tabs={guestTabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                ariaLabel={STRINGS.GUEST_TABS_ARIA}
              />

              <div
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
              >
                {visibleEnvelopes.length === 0 ? (
                  <div className="app__empty">
                    {activeTab === 'friend-letters' ? (
                      <>
                        <Heading level={2}>{STRINGS.GUEST_EMPTY_FRIEND_LETTERS}</Heading>
                        <Text color="muted">{STRINGS.GUEST_EMPTY_FRIEND_LETTERS_MESSAGE}</Text>
                      </>
                    ) : (
                      <>
                        <Heading level={2}>{STRINGS.APP_EMPTY_TITLE}</Heading>
                        <Text color="muted">{STRINGS.APP_EMPTY_MESSAGE}</Text>
                      </>
                    )}
                  </div>
                ) : (
                  <EnvelopePile
                    key={activeTab}
                    envelopes={visibleEnvelopes}
                    onStatusChange={(id, status) => updateStatus(id, status)}
                    viewMode={pileViewMode}
                    onViewModeChange={setPileViewMode}
                  />
                )}
              </div>
            </>
          )}
        </main>

        {/* Floating Spotify button (visible when URL configured) */}
        <SpotifyButton />
      </div>
    </MotionConfig>
  );
}

export default App;
