import type { GeneratedName } from 'shared';
import { STRINGS } from '../../../constants/strings';
import './NameCard.css';

interface NameCardProps {
  /** The generated name data to display */
  name: GeneratedName;
  /** Current drag position for visual feedback */
  dragState: { x: number; y: number };
  /** Whether this card is the active (top) card */
  isActive: boolean;
}

/**
 * Individual name card displaying name, origin, meaning, and notes.
 *
 * Visual feedback during drag:
 * - Dragging right: warm gold tint (Love)
 * - Dragging left: subtle fade (Nope)
 * - Dragging down: soft sage tint (Maybe)
 *
 * Card rotation follows drag direction for natural feel.
 */
export function NameCard({ name, dragState, isActive }: NameCardProps) {
  const absX = Math.abs(dragState.x);
  const absY = Math.abs(dragState.y);
  const isHorizontal = absX > absY;

  // Calculate overlay opacity based on drag distance (max 0.35)
  const loveOpacity = isActive && isHorizontal && dragState.x > 0
    ? Math.min(absX / 200, 0.35)
    : 0;
  const nopeOpacity = isActive && isHorizontal && dragState.x < 0
    ? Math.min(absX / 200, 0.35)
    : 0;
  const maybeOpacity = isActive && !isHorizontal && dragState.y > 0
    ? Math.min(absY / 200, 0.35)
    : 0;

  return (
    <div
      className={`name-card ${isActive ? 'name-card--active' : ''}`}
      aria-label={`Name: ${name.name}`}
    >
      {/* Directional overlays for drag feedback */}
      <div
        className="name-card__overlay name-card__overlay--love"
        style={{ opacity: loveOpacity }}
        aria-hidden="true"
      />
      <div
        className="name-card__overlay name-card__overlay--nope"
        style={{ opacity: nopeOpacity }}
        aria-hidden="true"
      />
      <div
        className="name-card__overlay name-card__overlay--maybe"
        style={{ opacity: maybeOpacity }}
        aria-hidden="true"
      />

      {/* Card content */}
      <div className="name-card__content">
        <h2 className="name-card__name">{name.name}</h2>

        <div className="name-card__details">
          <div className="name-card__field">
            <span className="name-card__label">{STRINGS.NAME_GAME_ORIGIN_LABEL}</span>
            <span className="name-card__value">{name.origin.join(', ')}</span>
          </div>

          <div className="name-card__field">
            <span className="name-card__label">{STRINGS.NAME_GAME_MEANING_LABEL}</span>
            <span className="name-card__value">{name.meaning}</span>
          </div>

          {name.notes && (
            <div className="name-card__field name-card__field--notes">
              <span className="name-card__value name-card__value--notes">{name.notes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
