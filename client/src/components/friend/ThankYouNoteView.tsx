import type { FriendThankYouNote } from 'shared';
import { Text } from '../common';
import { STRINGS } from '../../constants/strings';
import './ThankYouNoteView.css';

interface ThankYouNoteViewProps {
  note: FriendThankYouNote;
}

/**
 * Read-only display of the couple's personalized thank-you note
 */
export function ThankYouNoteView({ note }: ThankYouNoteViewProps) {
  return (
    <div className="thank-you-note">
      <div className="thank-you-note__header">
        <Text className="thank-you-note__label">{STRINGS.FRIEND_THANK_YOU_LABEL}</Text>
      </div>
      <div className="thank-you-note__content">
        <p className="thank-you-note__text">{note.content}</p>
        {note.mediaUrl && note.mediaType === 'image' && (
          <img src={note.mediaUrl} alt="Thank you" className="thank-you-note__image" />
        )}
        {note.mediaUrl && note.mediaType === 'video' && (
          <video src={note.mediaUrl} controls className="thank-you-note__video" preload="metadata" />
        )}
        {note.mediaUrl && note.mediaType === 'audio' && (
          <audio src={note.mediaUrl} controls className="thank-you-note__audio" preload="metadata" />
        )}
      </div>
    </div>
  );
}
