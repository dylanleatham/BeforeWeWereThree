import { useState, useCallback } from 'react';
import type { FriendLetterRecipient, FriendLetter } from 'shared';
import { MotionConfig } from 'motion/react';
import { Plus } from 'lucide-react';
import { Button, Heading, Text } from '../common';
import { useFriendDashboard } from '../../hooks/useFriendDashboard';
import { FriendLetterCard } from './FriendLetterCard';
import { FriendLetterActivity } from './FriendLetterActivity';
import { ThankYouNoteView } from './ThankYouNoteView';
import { createFriendLetter } from '../../services/friendApi';
import { STRINGS } from '../../constants/strings';
import './FriendDashboard.css';

type ActiveView =
  | { type: 'dashboard' }
  | { type: 'pick-recipient' }
  | { type: 'letter'; letterId: string; recipientName: string; initialLetter: FriendLetter | null };

/**
 * Main dashboard view for friend role
 * Shows greeting, thank-you note, and letter list with "write new letter" option
 */
export function FriendDashboard() {
  const { dashboard, isLoading, error, refetch } = useFriendDashboard();
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'dashboard' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handlePickRecipient = useCallback(async (recipient: FriendLetterRecipient) => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const letter = await createFriendLetter(recipient);
      setActiveView({
        type: 'letter',
        letterId: letter.id,
        recipientName: STRINGS.RECIPIENT_NAMES[recipient],
        initialLetter: letter,
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create letter');
    } finally {
      setIsCreating(false);
    }
  }, []);

  const handleOpenLetter = useCallback((letterId: string) => {
    if (!dashboard) return;
    const card = dashboard.letters.find((l) => l.id === letterId);
    if (!card) return;
    setActiveView({
      type: 'letter',
      letterId: card.id,
      recipientName: card.recipientName,
      // Pass a minimal FriendLetter for the initial state
      initialLetter: {
        id: card.id,
        friendId: dashboard.friend.id,
        recipient: card.recipient,
        title: card.title,
        content: card.content,
        mediaUrl: null,
        mediaType: null,
        submittedAt: card.submittedAt,
        createdAt: '',
        updatedAt: '',
      },
    });
  }, [dashboard]);

  if (isLoading) {
    return (
      <div className="friend-dashboard friend-dashboard--loading">
        <div className="app-loading__spinner" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="friend-dashboard friend-dashboard--error">
        <Text color="muted">{error || 'Something went wrong'}</Text>
        <button onClick={refetch} className="friend-dashboard__retry">
          {STRINGS.APP_RETRY}
        </button>
      </div>
    );
  }

  // Active letter writing view
  if (activeView.type === 'letter') {
    return (
      <MotionConfig reducedMotion="user">
        <FriendLetterActivity
          letterId={activeView.letterId}
          recipientName={activeView.recipientName}
          initialLetter={activeView.initialLetter}
          onBack={() => {
            setActiveView({ type: 'dashboard' });
            refetch();
          }}
        />
      </MotionConfig>
    );
  }

  // Recipient picker
  if (activeView.type === 'pick-recipient') {
    return (
      <MotionConfig reducedMotion="user">
        <div className="friend-dashboard">
          <header className="friend-dashboard__header">
            <Heading level={2} className="friend-dashboard__section-title">
              {STRINGS.FRIEND_PICK_RECIPIENT}
            </Heading>
          </header>
          <div className="friend-dashboard__recipient-picker">
            {(['you', 'partner', 'baby'] as FriendLetterRecipient[]).map((recipient) => (
              <Button
                key={recipient}
                variant="secondary"
                onClick={() => handlePickRecipient(recipient)}
                disabled={isCreating}
                className="friend-dashboard__recipient-btn"
              >
                {STRINGS.FRIEND_LETTER_TO(STRINGS.RECIPIENT_NAMES[recipient])}
              </Button>
            ))}
          </div>
          {createError && <Text variant="small" color="muted">{createError}</Text>}
          <Button
            variant="secondary"
            onClick={() => setActiveView({ type: 'dashboard' })}
            disabled={isCreating}
          >
            {STRINGS.MANAGER_CANCEL}
          </Button>
        </div>
      </MotionConfig>
    );
  }

  // Dashboard view
  return (
    <MotionConfig reducedMotion="user">
      <div className="friend-dashboard">
        <header className="friend-dashboard__header">
          <Heading level={1} className="friend-dashboard__title">
            {STRINGS.FRIEND_GREETING(dashboard.friend.name)}
          </Heading>
          <Text color="muted" className="friend-dashboard__subtitle">
            {STRINGS.FRIEND_SUBTITLE}
          </Text>
        </header>

        {dashboard.thankYouNote && (
          <section className="friend-dashboard__thank-you">
            <ThankYouNoteView note={dashboard.thankYouNote} />
          </section>
        )}

        <section className="friend-dashboard__letters">
          <Heading level={2} className="friend-dashboard__section-title">
            {STRINGS.FRIEND_LETTERS_TITLE}
          </Heading>
          <div className="friend-dashboard__letter-list">
            {dashboard.letters.map((card) => (
              <FriendLetterCard
                key={card.id}
                card={card}
                onClick={handleOpenLetter}
              />
            ))}
            <Button
              variant="secondary"
              onClick={() => setActiveView({ type: 'pick-recipient' })}
              className="friend-dashboard__new-letter-btn"
            >
              <Plus size={16} />
              <span>{STRINGS.FRIEND_NEW_LETTER}</span>
            </Button>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
