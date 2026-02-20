import { useState } from 'react';
import { motion } from 'motion/react';
import { useMediaLibrary } from '../../../hooks/useMediaLibrary';
import { useMediaUpload } from '../../../hooks/useMediaUpload';
import { PhotoGrid } from './PhotoGrid';
import { SlideshowViewer } from './SlideshowViewer';
import { STRINGS } from '../../../constants/strings';
import './MediaLibraryActivity.css';

interface MediaLibraryActivityProps {
  /** Envelope ID for this activity */
  envelopeId: string;
  /** Callback when activity is complete (not used for media library) */
  onComplete: () => void;
  /** Whether user is admin (shows delete buttons) */
  isAdmin?: boolean;
}

/**
 * Media Library Activity
 *
 * Displays a browseable photo grid with slideshow viewer.
 * Features:
 * - Responsive photo grid
 * - Fullscreen slideshow with zoom
 * - Shuffle toggle for slideshow
 * - Photo upload capability
 * - Admin delete functionality
 *
 * Note: This activity doesn't have a "complete" state - it's always available
 * for browsing once opened.
 */
export function MediaLibraryActivity({
  envelopeId: _envelopeId,
  onComplete: _onComplete,
  isAdmin = false,
}: MediaLibraryActivityProps) {
  // Photo list state
  const { photos, isLoading, error, refresh, deletePhoto } = useMediaLibrary();

  // Upload state
  const {
    isUploading,
    progress,
    error: uploadError,
    upload,
    reset: resetUpload,
  } = useMediaUpload({ accept: 'image', registerInDatabase: true });

  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);

  // Handle photo click - open slideshow
  const handlePhotoClick = (index: number) => {
    setStartIndex(index);
    setSlideshowOpen(true);
  };

  // Handle slideshow close
  const handleCloseSlideshow = () => {
    setSlideshowOpen(false);
  };

  // Handle shuffle toggle
  const handleShuffleToggle = () => {
    setShuffleEnabled((prev) => !prev);
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file);
    if (result) {
      // Refresh photo list after successful upload
      await refresh();
      resetUpload();
    }

    // Reset file input
    e.target.value = '';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="media-library media-library--loading">
        <motion.div
          className="media-library__spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          aria-label={STRINGS.MEDIA_LOADING_ARIA}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="media-library media-library--error">
        <p className="media-library__error-message">{error}</p>
        <button className="media-library__retry" onClick={refresh}>
          {STRINGS.APP_RETRY}
        </button>
      </div>
    );
  }

  return (
    <div className="media-library">
      {/* Header with title and controls */}
      <header className="media-library__header">
        <h2 className="media-library__title">{STRINGS.MEDIA_TITLE}</h2>
        <div className="media-library__controls">
          {/* Shuffle toggle */}
          <label className="media-library__shuffle">
            <input
              type="checkbox"
              checked={shuffleEnabled}
              onChange={handleShuffleToggle}
              className="media-library__shuffle-checkbox"
            />
            <span className="media-library__shuffle-label">{STRINGS.MEDIA_SHUFFLE}</span>
          </label>
        </div>
      </header>

      {/* Upload section */}
      <div className="media-library__upload">
        <label className="media-library__upload-button">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="media-library__upload-input"
          />
          {isUploading ? (
            <span className="media-library__upload-progress">
              {STRINGS.MEDIA_UPLOAD_PROGRESS(progress)}
            </span>
          ) : (
            <span className="media-library__upload-text">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              {STRINGS.MEDIA_ADD_PHOTO}
            </span>
          )}
        </label>
        {uploadError && (
          <p className="media-library__upload-error">{uploadError}</p>
        )}
      </div>

      {/* Photo grid */}
      <div className="media-library__grid">
        <PhotoGrid
          photos={photos}
          onPhotoClick={handlePhotoClick}
          isAdmin={isAdmin}
          onDelete={deletePhoto}
        />
      </div>

      {/* Slideshow viewer */}
      <SlideshowViewer
        photos={photos}
        isOpen={slideshowOpen}
        startIndex={startIndex}
        onClose={handleCloseSlideshow}
        shuffle={shuffleEnabled}
      />
    </div>
  );
}
