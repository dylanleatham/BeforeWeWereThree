import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { MediaAttachment } from '../../common/MediaAttachment';
import { STRINGS } from '../../../constants/strings';
import './CapturingPhase.css';

interface CapturingPhaseProps {
  promptText: string;
  onSubmit: (photoUrl: string) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Capturing phase: shows the prompt and allows photo upload.
 * Uses the existing MediaAttachment component for camera/file upload.
 */
export function CapturingPhase({ promptText, onSubmit, isSubmitting }: CapturingPhaseProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const handleMediaChange = useCallback((url: string | null) => {
    setPhotoUrl(url);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!photoUrl) return;
    await onSubmit(photoUrl);
  }, [photoUrl, onSubmit]);

  return (
    <div className="photo-prompt-capturing">
      <motion.div
        className="photo-prompt-capturing__content"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Prompt text */}
        <p className="photo-prompt-capturing__prompt">{promptText}</p>

        {/* Photo upload area */}
        <div className="photo-prompt-capturing__upload">
          <MediaAttachment
            mediaUrl={photoUrl}
            mediaType={photoUrl ? 'image' : null}
            onChange={(url) => handleMediaChange(url)}
            accept="image"
            disabled={isSubmitting}
          />
        </div>

        {/* Submit button */}
        {photoUrl && (
          <motion.button
            type="button"
            className="photo-prompt-capturing__submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {isSubmitting ? STRINGS.LETTER_SAVING : STRINGS.PHOTO_PROMPT_SUBMIT}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
