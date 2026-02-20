import { useRef, useCallback } from 'react';
import { Upload, X, Film, Mic, Image } from 'lucide-react';
import { useMediaUpload } from '../../hooks/useMediaUpload';
import type { UseMediaUploadOptions } from '../../hooks/useMediaUpload';
import { STRINGS } from '../../constants/strings';
import './MediaAttachment.css';

interface MediaAttachmentProps {
  /** Current media URL (if already attached) */
  mediaUrl: string | null;
  /** Current media type */
  mediaType: string | null;
  /** Callback when media is attached/removed */
  onChange: (url: string | null, type: string | null) => void;
  /** Whether editing is disabled (e.g., after submission) */
  disabled?: boolean;
  /** Which file types to accept. Defaults to 'all' (image/video/audio). */
  accept?: UseMediaUploadOptions['accept'];
  /** Whether to register uploads in the Photo table. Defaults to false. */
  registerInDatabase?: boolean;
}

const FILE_ACCEPT: Record<string, string> = {
  image: 'image/*',
  all: 'image/*,video/*,audio/*',
};

/**
 * Detect media category from content type or URL
 */
function getMediaCategory(mediaType: string | null, url: string | null): 'image' | 'video' | 'audio' | null {
  if (mediaType) {
    if (mediaType === 'image' || mediaType.startsWith('image/')) return 'image';
    if (mediaType === 'video' || mediaType.startsWith('video/')) return 'video';
    if (mediaType === 'audio' || mediaType.startsWith('audio/')) return 'audio';
  }
  if (url) {
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext && ['mp4', 'webm', 'mov'].includes(ext)) return 'video';
    if (ext && ['mp3', 'wav', 'ogg', 'webm', 'm4a'].includes(ext)) return 'audio';
  }
  return null;
}

/**
 * Unified media attachment component for photo/video/audio
 * Supports file upload from device
 */
export function MediaAttachment({
  mediaUrl,
  mediaType,
  onChange,
  disabled = false,
  accept = 'all',
  registerInDatabase = false,
}: MediaAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress, error, reset } = useMediaUpload({ accept, registerInDatabase });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const blobUrl = await upload(file);
    if (blobUrl) {
      let category: string | null = null;
      if (file.type.startsWith('image/')) category = 'image';
      else if (file.type.startsWith('video/')) category = 'video';
      else if (file.type.startsWith('audio/')) category = 'audio';
      onChange(blobUrl, category);
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [upload, onChange]);

  const handleRemove = useCallback(() => {
    onChange(null, null);
    reset();
  }, [onChange, reset]);

  const category = getMediaCategory(mediaType, mediaUrl);

  // Show existing attachment
  if (mediaUrl && !isUploading) {
    return (
      <div className="media-attachment media-attachment--preview">
        {category === 'image' && (
          <img
            src={mediaUrl}
            alt={STRINGS.PHOTO_ALT_ATTACHED}
            className="media-attachment__image"
          />
        )}
        {category === 'video' && (
          <video
            src={mediaUrl}
            controls
            className="media-attachment__video"
            preload="metadata"
          />
        )}
        {category === 'audio' && (
          <audio
            src={mediaUrl}
            controls
            className="media-attachment__audio"
            preload="metadata"
          />
        )}
        {!disabled && (
          <button
            className="media-attachment__remove"
            onClick={handleRemove}
            aria-label={STRINGS.PHOTO_REMOVE_ARIA}
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  // Show upload UI
  if (disabled) return null;

  return (
    <div className="media-attachment">
      {isUploading ? (
        <div className="media-attachment__progress">
          <div
            className="media-attachment__progress-bar"
            style={{ width: `${progress}%` }}
          />
          <span className="media-attachment__progress-text">
            {STRINGS.MEDIA_UPLOAD_PROGRESS(progress)}
          </span>
        </div>
      ) : (
        <button
          className="media-attachment__upload-btn"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload size={18} />
          <span>{accept === 'image' ? STRINGS.MEDIA_ADD_PHOTO : STRINGS.MEDIA_ADD_ATTACHMENT}</span>
          {accept === 'all' && (
            <span className="media-attachment__types">
              <Image size={14} />
              <Film size={14} />
              <Mic size={14} />
            </span>
          )}
        </button>
      )}
      {error && <p className="media-attachment__error">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_ACCEPT[accept]}
        onChange={handleFileSelect}
        className="media-attachment__input"
        aria-label={STRINGS.PHOTO_SELECT_ARIA}
      />
    </div>
  );
}
