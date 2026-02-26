import { motion } from 'motion/react';
import { Mail, MailOpen, Heart, Sparkles, Camera } from 'lucide-react';
import clsx from 'clsx';
import type { Envelope } from 'shared';
import { badgeVariants } from '../../utils/motion';
import { hasCompletedView, formatEnvelopeTypeLabel } from '../../utils/envelope';
import { STRINGS } from '../../constants/strings';
import { EVERGREEN_ENVELOPE_TYPES } from '../../constants/config';
import { HOVER_LIFT_PX, TAP_SCALE } from '../../constants/animation';
import './EnvelopeCard.css';

interface EnvelopeCardProps {
  envelope: Envelope;
  partnerPresent?: boolean;
  onClick?: () => void;
}

/**
 * Envelope card for pile display
 * Shows title, activity type label, status indicator
 * Per CONTEXT.md: wax seal for sealed, open flap for opened, heart badge for completed
 */
export function EnvelopeCard({
  envelope,
  partnerPresent = false,
  onClick,
}: EnvelopeCardProps) {
  const { status, title, type } = envelope;
  const isEvergreen = EVERGREEN_ENVELOPE_TYPES.has(type);
  const isSealed = status === 'sealed';
  const isCompleted = status === 'completed';
  const isClickable = isEvergreen || !isCompleted || hasCompletedView(type);
  const typeLabel = formatEnvelopeTypeLabel(type);

  return (
    <motion.article
      className={clsx('envelope-card', isEvergreen ? 'envelope-card--evergreen' : `envelope-card--${status}`, `envelope-card--type-${type}`)}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? (isEvergreen ? STRINGS.CARD_ARIA_PLAY(title) : STRINGS.CARD_ARIA_OPEN(title)) : title}
      whileHover={
        isClickable
          ? { y: -HOVER_LIFT_PX, boxShadow: 'var(--shadow-elevated-hover)' }
          : undefined
      }
      whileTap={isClickable ? { scale: TAP_SCALE } : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Partner presence indicator */}
      {partnerPresent && (
        <span className="envelope-card__partner" aria-label={STRINGS.CARD_PARTNER_ARIA}>
          <span className="envelope-card__partner-dot" />
        </span>
      )}

      {/* Wax seal (sealed only, not evergreen) */}
      {isSealed && !isEvergreen && <div className="envelope-card__seal" aria-hidden="true" />}

      {/* Completion badge (completed only, not evergreen) */}
      {isCompleted && !isEvergreen && (
        <motion.span
          className="envelope-card__badge"
          variants={badgeVariants}
          initial="hidden"
          animate="visible"
          aria-label={STRINGS.CARD_COMPLETED_ARIA}
        >
          <Heart size={18} fill="currentColor" />
        </motion.span>
      )}

      {/* Icon */}
      <div className="envelope-card__icon">
        {type === 'photo-prompt' ? (
          <Camera size={28} strokeWidth={1.5} />
        ) : isEvergreen ? (
          <Sparkles size={28} strokeWidth={1.5} />
        ) : isSealed ? (
          <Mail size={28} strokeWidth={1.5} />
        ) : (
          <MailOpen size={28} strokeWidth={1.5} />
        )}
      </div>

      {/* Content */}
      <h3 className="envelope-card__title">{title}</h3>
      <span className="envelope-card__type">{typeLabel}</span>
    </motion.article>
  );
}
