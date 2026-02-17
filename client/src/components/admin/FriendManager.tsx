import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Heart, Eye } from 'lucide-react';
import type { Friend, FriendThankYouNote, FriendLetter } from 'shared';
import { Button, Card, Heading, Text } from '../common';
import { ThankYouNoteEditor } from './ThankYouNoteEditor';
import {
  getAdminFriendList,
  createFriend,
  deleteFriend,
  getAdminFriendLetters,
} from '../../services/friendApi';
import { STRINGS } from '../../constants/strings';
import { PIN_LENGTH } from '../../constants/config';
import './FriendManager.css';

interface FriendWithCounts extends Friend {
  letterCount: number;
  submittedCount: number;
}

type ViewMode =
  | { type: 'list' }
  | { type: 'add' }
  | { type: 'thank-you'; friendId: string; friendName: string; existingNote: FriendThankYouNote | null }
  | { type: 'letters'; friendId: string; friendName: string; letters: FriendLetter[] };

/**
 * Admin section for managing friends who write letters
 */
export function FriendManager() {
  const [friends, setFriends] = useState<FriendWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>({ type: 'list' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add friend form state
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');

  const fetchFriends = useCallback(async () => {
    try {
      const data = await getAdminFriendList();
      setFriends(data.friends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || newPin.length !== PIN_LENGTH) return;

    setIsSaving(true);
    setError(null);

    try {
      await createFriend({ name: newName.trim(), pin: newPin });
      setNewName('');
      setNewPin('');
      setViewMode({ type: 'list' });
      await fetchFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create friend');
    } finally {
      setIsSaving(false);
    }
  }, [newName, newPin, fetchFriends]);

  const handleDelete = useCallback(
    async (friendId: string) => {
      setIsSaving(true);
      try {
        await deleteFriend(friendId);
        setDeleteConfirm(null);
        await fetchFriends();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete friend');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchFriends]
  );

  const handleViewLetters = useCallback(async (friendId: string, friendName: string) => {
    try {
      const data = await getAdminFriendLetters(friendId);
      setViewMode({
        type: 'letters',
        friendId,
        friendName,
        letters: data.letters,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load letters');
    }
  }, []);

  // Add friend form
  if (viewMode.type === 'add') {
    return (
      <section className="friend-manager">
        <Heading level={3}>{STRINGS.FRIEND_MANAGER_HEADING}</Heading>
        <Card className="friend-manager__form">
          <div className="friend-manager__field">
            <label className="friend-manager__label">{STRINGS.FRIEND_MANAGER_NAME_LABEL}</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="friend-manager__input"
              disabled={isSaving}
            />
          </div>
          <div className="friend-manager__field">
            <label className="friend-manager__label">{STRINGS.FRIEND_MANAGER_PIN_LABEL}</label>
            <input
              type="text"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
              className="friend-manager__input"
              maxLength={PIN_LENGTH}
              placeholder="MMDDYYYY"
              disabled={isSaving}
            />
          </div>
          {error && <Text variant="small" color="muted">{error}</Text>}
          <div className="friend-manager__form-actions">
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={isSaving || !newName.trim() || newPin.length !== PIN_LENGTH}
            >
              {isSaving ? STRINGS.LETTER_SAVING : STRINGS.FRIEND_MANAGER_ADD}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setViewMode({ type: 'list' });
                setError(null);
              }}
              disabled={isSaving}
            >
              {STRINGS.MANAGER_CANCEL}
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  // Thank-you note editor
  if (viewMode.type === 'thank-you') {
    return (
      <section className="friend-manager">
        <Heading level={3}>
          {STRINGS.FRIEND_MANAGER_THANK_YOU} - {viewMode.friendName}
        </Heading>
        <ThankYouNoteEditor
          friendId={viewMode.friendId}
          existingNote={viewMode.existingNote}
          onSaved={() => {
            setViewMode({ type: 'list' });
            fetchFriends();
          }}
          onCancel={() => setViewMode({ type: 'list' })}
        />
      </section>
    );
  }

  // Letters view
  if (viewMode.type === 'letters') {
    return (
      <section className="friend-manager">
        <Heading level={3}>
          Letters from {viewMode.friendName}
        </Heading>
        {viewMode.letters.length === 0 ? (
          <Text color="muted">No letters submitted yet.</Text>
        ) : (
          <div className="friend-manager__letters">
            {viewMode.letters.map((letter) => (
              <Card key={letter.id} className="friend-manager__letter-card">
                <Text className="friend-manager__letter-recipient">
                  To {letter.recipient}
                </Text>
                <Text variant="small" color="muted">
                  {letter.submittedAt ? `Submitted ${new Date(letter.submittedAt).toLocaleDateString()}` : 'Draft'}
                </Text>
                <p className="friend-manager__letter-content">{letter.content}</p>
                {letter.mediaUrl && letter.mediaType === 'image' && (
                  <img src={letter.mediaUrl} alt="" className="friend-manager__letter-media" />
                )}
                {letter.mediaUrl && letter.mediaType === 'video' && (
                  <video src={letter.mediaUrl} controls className="friend-manager__letter-media" preload="metadata" />
                )}
                {letter.mediaUrl && letter.mediaType === 'audio' && (
                  <audio src={letter.mediaUrl} controls preload="metadata" />
                )}
              </Card>
            ))}
          </div>
        )}
        <Button variant="secondary" onClick={() => setViewMode({ type: 'list' })}>
          {STRINGS.FRIEND_BACK_TO_DASHBOARD}
        </Button>
      </section>
    );
  }

  // Friend list
  return (
    <section className="friend-manager">
      <header className="friend-manager__header">
        <Heading level={3}>{STRINGS.FRIEND_MANAGER_HEADING}</Heading>
        <Button variant="secondary" onClick={() => setViewMode({ type: 'add' })}>
          <Plus size={16} />
          <span>{STRINGS.FRIEND_MANAGER_ADD}</span>
        </Button>
      </header>

      {isLoading ? (
        <Text color="muted">Loading...</Text>
      ) : friends.length === 0 ? (
        <Text color="muted">{STRINGS.FRIEND_MANAGER_EMPTY}</Text>
      ) : (
        <ul className="friend-manager__list">
          {friends.map((friend) => (
            <li key={friend.id} className="friend-manager__item">
              <Card className="friend-manager__card">
                <div className="friend-manager__info">
                  <span className="friend-manager__name">{friend.name}</span>
                  <span className="friend-manager__pin">PIN: {friend.pin}</span>
                  <Text variant="small" color="muted">
                    {STRINGS.FRIEND_MANAGER_LETTERS(friend.submittedCount)}
                  </Text>
                </div>
                <div className="friend-manager__actions">
                  <button
                    className="friend-manager__btn"
                    onClick={() =>
                      setViewMode({
                        type: 'thank-you',
                        friendId: friend.id,
                        friendName: friend.name,
                        existingNote: null,
                      })
                    }
                    title={STRINGS.FRIEND_MANAGER_THANK_YOU}
                    disabled={isSaving}
                  >
                    <Heart size={18} />
                  </button>
                  <button
                    className="friend-manager__btn"
                    onClick={() => handleViewLetters(friend.id, friend.name)}
                    title={STRINGS.FRIEND_MANAGER_VIEW_LETTERS}
                    disabled={isSaving}
                  >
                    <Eye size={18} />
                  </button>
                  {deleteConfirm === friend.id ? (
                    <>
                      <button
                        className="friend-manager__btn friend-manager__btn--danger"
                        onClick={() => handleDelete(friend.id)}
                        disabled={isSaving}
                      >
                        {STRINGS.MANAGER_CONFIRM}
                      </button>
                      <button
                        className="friend-manager__btn"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={isSaving}
                      >
                        {STRINGS.MANAGER_CANCEL}
                      </button>
                    </>
                  ) : (
                    <button
                      className="friend-manager__btn friend-manager__btn--danger"
                      onClick={() => setDeleteConfirm(friend.id)}
                      disabled={isSaving}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {error && <Text variant="small" color="muted">{error}</Text>}
    </section>
  );
}
