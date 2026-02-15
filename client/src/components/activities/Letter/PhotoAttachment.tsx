import { useRef } from 'react';
import { usePhotoUpload } from '../../../hooks/usePhotoUpload';
import { STRINGS } from '../../../constants/strings';
import './PhotoAttachment.css';

interface PhotoAttachmentProps {
  /** Current photo URL (null if no photo attached) */
  photoUrl: string | null;
  /** Callback when photo changes */
  onPhotoChange: (url: string | null) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Photo attachment component for letters
 *
 * Three states:
 * 1. No photo - shows upload button
 * 2. Uploading - shows progress bar
 * 3. Photo attached - shows preview with remove button
 */
export function PhotoAttachment({
  photoUrl,
  onPhotoChange,
  disabled = false,
}: PhotoAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUploading, progress, error, upload, reset } = usePhotoUpload();

  const handleButtonClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const blobUrl = await upload(file);
    if (blobUrl) {
      onPhotoChange(blobUrl);
    }

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onPhotoChange(null);
    reset();
  };

  // Show preview if photo is attached
  if (photoUrl) {
    return (
      <div className="photo-attachment photo-attachment--preview">
        <div className="photo-attachment__image-container">
          <img
            src={photoUrl}
            alt={STRINGS.PHOTO_ALT_ATTACHED}
            className="photo-attachment__image"
          />
          {!disabled && (
            <button
              type="button"
              className="photo-attachment__remove"
              onClick={handleRemove}
              aria-label={STRINGS.PHOTO_REMOVE_ARIA}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show upload progress
  if (isUploading) {
    return (
      <div className="photo-attachment photo-attachment--uploading">
        <div className="photo-attachment__progress">
          <div className="photo-attachment__progress-bar">
            <div
              className="photo-attachment__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="photo-attachment__progress-text">
            {STRINGS.MEDIA_UPLOAD_PROGRESS(progress)}
          </span>
        </div>
      </div>
    );
  }

  // Show upload button
  return (
    <div className="photo-attachment photo-attachment--empty">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="photo-attachment__input"
        disabled={disabled}
        aria-label={STRINGS.PHOTO_SELECT_ARIA}
      />
      <button
        type="button"
        className="photo-attachment__button"
        onClick={handleButtonClick}
        disabled={disabled}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="24"
          height="24"
        >
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
        {STRINGS.MEDIA_ADD_PHOTO}
      </button>
      {error && <p className="photo-attachment__error">{error}</p>}
    </div>
  );
}
