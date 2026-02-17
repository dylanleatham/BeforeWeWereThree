import { useState, useCallback } from 'react';
import type { FriendThankYouNote } from 'shared';
import { Button, Text } from '../common';
import { MediaAttachment } from '../common/MediaAttachment';
import { saveThankYouNote } from '../../services/friendApi';
import { STRINGS } from '../../constants/strings';
import './ThankYouNoteEditor.css';

interface ThankYouNoteEditorProps {
  friendId: string;
  existingNote: FriendThankYouNote | null;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Admin editor for writing thank-you notes to friends
 */
export function ThankYouNoteEditor({
  friendId,
  existingNote,
  onSaved,
  onCancel,
}: ThankYouNoteEditorProps) {
  const [content, setContent] = useState(existingNote?.content ?? '');
  const [mediaUrl, setMediaUrl] = useState<string | null>(existingNote?.mediaUrl ?? null);
  const [mediaType, setMediaType] = useState<string | null>(existingNote?.mediaType ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveThankYouNote(friendId, { content, mediaUrl, mediaType });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [friendId, content, mediaUrl, mediaType, onSaved]);

  return (
    <div className="thank-you-editor">
      <textarea
        className="thank-you-editor__textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={STRINGS.FRIEND_THANK_YOU_PLACEHOLDER}
        disabled={isSaving}
      />

      <MediaAttachment
        mediaUrl={mediaUrl}
        mediaType={mediaType}
        onChange={(url, type) => {
          setMediaUrl(url);
          setMediaType(type);
        }}
        disabled={isSaving}
      />

      {error && <Text variant="small" color="muted">{error}</Text>}

      <div className="thank-you-editor__actions">
        <Button variant="primary" onClick={handleSave} disabled={isSaving || !content.trim()}>
          {isSaving ? STRINGS.LETTER_SAVING : STRINGS.FRIEND_THANK_YOU_SAVE}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          {STRINGS.MANAGER_CANCEL}
        </Button>
      </div>
    </div>
  );
}
