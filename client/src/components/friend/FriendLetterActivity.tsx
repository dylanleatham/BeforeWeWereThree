import { useState, useCallback } from 'react';
import type { FriendLetter } from 'shared';
import { Button, Text } from '../common';
import { MediaAttachment } from '../common/MediaAttachment';
import { useFriendLetter } from '../../hooks/useFriendLetter';
import { STRINGS } from '../../constants/strings';
import './FriendLetterActivity.css';

interface FriendLetterActivityProps {
  letterId: string;
  recipientName: string;
  initialLetter: FriendLetter | null;
  onBack: () => void;
}

/**
 * Friend letter writing activity
 * Simplified version of LetterActivity - no collaborative phases
 */
export function FriendLetterActivity({
  letterId,
  recipientName,
  initialLetter,
  onBack,
}: FriendLetterActivityProps) {
  const {
    isSaving,
    isSubmitting,
    isSubmitted,
    lastSaved,
    error,
    save,
    submit,
  } = useFriendLetter(letterId, initialLetter);

  const [content, setContent] = useState(initialLetter?.content ?? '');
  const [mediaUrl, setMediaUrl] = useState<string | null>(initialLetter?.mediaUrl ?? null);
  const [mediaType, setMediaType] = useState<string | null>(initialLetter?.mediaType ?? null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      save(newContent, mediaUrl, mediaType);
    },
    [save, mediaUrl, mediaType]
  );

  const handleMediaChange = useCallback(
    (url: string | null, type: string | null) => {
      setMediaUrl(url);
      setMediaType(type);
      save(content, url, type);
    },
    [save, content]
  );

  const handleSubmit = useCallback(async () => {
    const success = await submit(content, mediaUrl, mediaType);
    if (success) {
      setShowConfirm(false);
    }
  }, [submit, content, mediaUrl, mediaType]);

  // Submitted state - warm confirmation
  if (isSubmitted) {
    return (
      <div className="friend-letter-activity friend-letter-activity--submitted">
        <div className="friend-letter-activity__complete">
          <span className="friend-letter-activity__complete-icon">{STRINGS.FRIEND_LETTER_SENT_ICON}</span>
          <Text className="friend-letter-activity__complete-title">
            {STRINGS.FRIEND_LETTER_SENT_TITLE}
          </Text>
          <Text color="muted" className="friend-letter-activity__complete-message">
            {STRINGS.FRIEND_LETTER_SENT_MESSAGE(recipientName)}
          </Text>
          <Button variant="secondary" onClick={onBack}>
            {STRINGS.FRIEND_BACK_TO_DASHBOARD}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="friend-letter-activity">
      <header className="friend-letter-activity__header">
        <button className="friend-letter-activity__back" onClick={onBack}>
          {STRINGS.FRIEND_BACK_TO_DASHBOARD}
        </button>
        <Text className="friend-letter-activity__to">
          {STRINGS.FRIEND_LETTER_TO(recipientName)}
        </Text>
      </header>

      <div className="friend-letter-activity__editor">
        <textarea
          className="friend-letter-activity__textarea"
          value={content}
          onChange={handleContentChange}
          placeholder={STRINGS.FRIEND_LETTER_PLACEHOLDER}
          disabled={isSubmitting}
        />

        <div className="friend-letter-activity__save-status">
          {isSaving && <Text variant="small" color="muted">{STRINGS.LETTER_SAVING}</Text>}
          {lastSaved && !isSaving && (
            <Text variant="small" color="muted">{STRINGS.LETTER_SAVED(lastSaved)}</Text>
          )}
        </div>

        <MediaAttachment
          mediaUrl={mediaUrl}
          mediaType={mediaType}
          onChange={handleMediaChange}
          disabled={isSubmitting}
        />

        {error && <Text variant="small" color="muted" className="friend-letter-activity__error">{error}</Text>}

        {showConfirm ? (
          <div className="friend-letter-activity__confirm">
            <Text variant="small">{STRINGS.FRIEND_LETTER_CONFIRM_MESSAGE}</Text>
            <div className="friend-letter-activity__confirm-actions">
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
              >
                {isSubmitting ? STRINGS.LETTER_SAVING : STRINGS.FRIEND_LETTER_CONFIRM_SUBMIT}
              </Button>
              <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                {STRINGS.MANAGER_CANCEL}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={() => setShowConfirm(true)}
            disabled={!content.trim() || isSubmitting}
            className="friend-letter-activity__submit"
          >
            {STRINGS.FRIEND_LETTER_SUBMIT}
          </Button>
        )}
      </div>
    </div>
  );
}
