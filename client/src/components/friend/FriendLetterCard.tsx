import { Check, Edit3 } from 'lucide-react';
import type { FriendLetterCard as FriendLetterCardType } from 'shared';
import { Card, Text } from '../common';
import { STRINGS } from '../../constants/strings';
import './FriendLetterCard.css';

interface FriendLetterCardProps {
  card: FriendLetterCardType;
  onClick: (letterId: string) => void;
}

/**
 * Card showing a friend letter's status in the dashboard
 */
export function FriendLetterCard({ card, onClick }: FriendLetterCardProps) {
  const { id, recipientName, title, status } = card;

  const statusIcon = {
    draft: <Edit3 size={20} />,
    submitted: <Check size={20} />,
  };

  const statusLabel = {
    draft: STRINGS.FRIEND_LETTER_DRAFT,
    submitted: STRINGS.FRIEND_LETTER_SUBMITTED,
  };

  return (
    <Card
      className={`friend-letter-card friend-letter-card--${status}`}
      onClick={status !== 'submitted' ? () => onClick(id) : undefined}
    >
      <div className="friend-letter-card__icon">
        {statusIcon[status]}
      </div>
      <div className="friend-letter-card__info">
        <Text className="friend-letter-card__recipient">
          {STRINGS.FRIEND_LETTER_TO(recipientName)}
        </Text>
        {title && (
          <Text variant="small" className="friend-letter-card__title">
            {title}
          </Text>
        )}
        <Text variant="small" color="muted" className="friend-letter-card__status">
          {statusLabel[status]}
        </Text>
      </div>
    </Card>
  );
}
