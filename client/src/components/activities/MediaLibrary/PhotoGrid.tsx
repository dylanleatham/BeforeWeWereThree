import type { Photo } from 'shared';
import { STRINGS } from '../../../constants/strings';
import './PhotoGrid.css';

interface PhotoGridProps {
  /** Array of photos to display */
  photos: Photo[];
  /** Callback when a photo is clicked (receives index) */
  onPhotoClick: (index: number) => void;
  /** Whether admin features are enabled */
  isAdmin?: boolean;
  /** Callback to delete a photo */
  onDelete?: (id: string) => void;
}

/**
 * Responsive photo grid component
 *
 * Displays photos in a grid layout:
 * - 3 columns on desktop
 * - 2 columns on mobile
 *
 * Thumbnails are square (aspect-ratio 1) with object-fit cover.
 * Admin mode shows delete button overlay on hover.
 */
export function PhotoGrid({
  photos,
  onPhotoClick,
  isAdmin = false,
  onDelete,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="photo-grid photo-grid--empty">
        <p className="photo-grid__empty-message">{STRINGS.MEDIA_EMPTY}</p>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPhotoClick(index);
    }
  };

  return (
    <div className="photo-grid">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="photo-grid__item"
          role="button"
          tabIndex={0}
          onClick={() => onPhotoClick(index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          aria-label={STRINGS.MEDIA_VIEW_PHOTO_ARIA(index + 1)}
        >
          <img
            src={photo.blobUrl}
            alt={photo.filename}
            className="photo-grid__thumbnail"
            loading="lazy"
          />
          {isAdmin && onDelete && (
            <button
              className="photo-grid__delete"
              onClick={(e) => handleDelete(e, photo.id)}
              aria-label={STRINGS.MEDIA_DELETE_PHOTO_ARIA(index + 1)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
              >
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
