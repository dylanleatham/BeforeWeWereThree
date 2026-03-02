import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { MediaAttachment } from '../../common/MediaAttachment';
import { STRINGS } from '../../../constants/strings';
import './CapturingPhase.css';

interface CapturingPhaseProps {
  envelopeId: string;
  promptText: string;
  onSubmit: (photoUrl: string) => Promise<void>;
  isSubmitting: boolean;
}

function getDraftKey(envelopeId: string): string {
  return `photo-prompt-draft:${envelopeId}`;
}

/**
 * Capturing phase: shows the prompt and allows photo upload.
 * Uses the existing MediaAttachment component for camera/file upload.
 * Persists the draft photo URL in sessionStorage so it survives close/reopen.
 */
export function CapturingPhase({ envelopeId, promptText, onSubmit, isSubmitting }: CapturingPhaseProps) {
  const draftKey = getDraftKey(envelopeId);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    () => sessionStorage.getItem(draftKey)
  );

  const handleMediaChange = useCallback((url: string | null) => {
    setPhotoUrl(url);
    if (url) {
      sessionStorage.setItem(draftKey, url);
    } else {
      sessionStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  const handleSubmit = useCallback(async () => {
    if (!photoUrl) return;
    await onSubmit(photoUrl);
    sessionStorage.removeItem(draftKey);
  }, [photoUrl, onSubmit, draftKey]);

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
