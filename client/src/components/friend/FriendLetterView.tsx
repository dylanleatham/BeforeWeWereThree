import { useState, useEffect } from 'react';
import type { FriendLetterViewResponse } from 'shared';
import { Text, Button } from '../common';
import { getFriendLetterView } from '../../services/friendApi';
import './FriendLetterView.css';

interface FriendLetterViewProps {
  friendLetterId: string;
  onComplete: () => void;
}

/**
 * Read-only view of a friend's letter for the couple
 */
export function FriendLetterView({ friendLetterId, onComplete }: FriendLetterViewProps) {
  const [letterView, setLetterView] = useState<FriendLetterViewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLetter() {
      try {
        const data = await getFriendLetterView(friendLetterId);
        setLetterView(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load letter');
      } finally {
        setIsLoading(false);
      }
    }
    fetchLetter();
  }, [friendLetterId]);

  if (isLoading) {
    return (
      <div className="friend-letter-view friend-letter-view--loading">
        <div className="app-loading__spinner" />
      </div>
    );
  }

  if (error || !letterView) {
    return (
      <div className="friend-letter-view friend-letter-view--error">
        <Text color="muted">{error || 'Letter not found'}</Text>
      </div>
    );
  }

  const recipientLabel = {
    you: 'Dylan',
    partner: 'Wife',
    baby: 'Baby',
  }[letterView.recipient] ?? letterView.recipient;

  return (
    <div className="friend-letter-view">
      <header className="friend-letter-view__header">
        <Text className="friend-letter-view__from">
          From {letterView.friendName}
        </Text>
        <Text variant="small" color="muted" className="friend-letter-view__to">
          To {recipientLabel}
        </Text>
      </header>

      <div className="friend-letter-view__content">
        <p className="friend-letter-view__text">{letterView.content}</p>

        {letterView.mediaUrl && letterView.mediaType === 'image' && (
          <img
            src={letterView.mediaUrl}
            alt={`From ${letterView.friendName}`}
            className="friend-letter-view__image"
          />
        )}
        {letterView.mediaUrl && letterView.mediaType === 'video' && (
          <video
            src={letterView.mediaUrl}
            controls
            className="friend-letter-view__video"
            preload="metadata"
          />
        )}
        {letterView.mediaUrl && letterView.mediaType === 'audio' && (
          <audio
            src={letterView.mediaUrl}
            controls
            className="friend-letter-view__audio"
            preload="metadata"
          />
        )}
      </div>

      <footer className="friend-letter-view__footer">
        <Button variant="secondary" onClick={onComplete}>
          Close
        </Button>
      </footer>
    </div>
  );
}
