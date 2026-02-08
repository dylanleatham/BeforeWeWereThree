import { useState, useCallback } from 'react';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { PhotoAttachment } from './PhotoAttachment';
import { STRINGS } from '../../../constants/strings';
import './WritingPhase.css';

interface WritingPhaseProps {
  /** The prompt text to display */
  prompt: string;
  /** Initial letter content (from previous save) */
  initialContent: string;
  /** Initial photo URL (from previous save) */
  initialPhotoUrl: string | null;
  /** Callback to save letter content */
  onSave: (content: string, photoUrl: string | null) => Promise<void>;
  /** Callback when user submits the letter */
  onSubmit: () => void;
  /** Whether submit is currently in progress */
  isSubmitting?: boolean;
}

/**
 * Writing phase component for Letter to Baby
 *
 * Provides:
 * - Styled prompt display
 * - Textarea with auto-save on typing pause
 * - Photo attachment below textarea
 * - Save status indicator
 * - Submit button
 */
export function WritingPhase({
  prompt,
  initialContent,
  initialPhotoUrl,
  onSave,
  onSubmit,
  isSubmitting = false,
}: WritingPhaseProps) {
  // Local state for content and photo
  const [content, setContent] = useState(initialContent);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);

  // Auto-save hook
  const {
    isSaving,
    lastSavedAt,
    isPending,
    save: autoSave,
    flush,
  } = useAutoSave<{ content: string; photoUrl: string | null }>({
    saveFn: async ({ content: c, photoUrl: p }) => {
      await onSave(c, p);
    },
    delay: 1500,
    maxWait: 5000,
  });

  /**
   * Handle content change
   */
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      autoSave({ content: newContent, photoUrl });
    },
    [autoSave, photoUrl]
  );

  /**
   * Handle photo change - save immediately
   */
  const handlePhotoChange = useCallback(
    (newPhotoUrl: string | null) => {
      setPhotoUrl(newPhotoUrl);
      // Save immediately when photo changes
      onSave(content, newPhotoUrl);
    },
    [content, onSave]
  );

  /**
   * Handle submit - flush pending saves first
   */
  const handleSubmit = useCallback(async () => {
    // Flush any pending save before submitting
    await flush();
    onSubmit();
  }, [flush, onSubmit]);

  // Determine if submit should be disabled
  const isSubmitDisabled = isSubmitting || isPending || isSaving || !content.trim();

  return (
    <div className="letter-writing">
      {/* Prompt */}
      <div className="letter-writing__prompt">
        <p className="letter-writing__prompt-text">{prompt}</p>
      </div>

      {/* Textarea */}
      <div className="letter-writing__editor">
        <textarea
          className="letter-writing__textarea"
          value={content}
          onChange={handleContentChange}
          placeholder={STRINGS.LETTER_PLACEHOLDER}
          rows={8}
          disabled={isSubmitting}
          aria-label="Write your letter"
        />

        {/* Save status */}
        <div className="letter-writing__status" aria-live="polite">
          {isSaving && (
            <span className="letter-writing__status-text letter-writing__status-text--saving">
              {STRINGS.LETTER_SAVING}
            </span>
          )}
          {!isSaving && lastSavedAt && (
            <span className="letter-writing__status-text letter-writing__status-text--saved">
              {STRINGS.LETTER_SAVED(lastSavedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Photo attachment */}
      <div className="letter-writing__photo">
        <PhotoAttachment
          photoUrl={photoUrl}
          onPhotoChange={handlePhotoChange}
          disabled={isSubmitting}
        />
      </div>

      {/* Submit button */}
      <button
        className="letter-writing__submit"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        type="button"
      >
        {isSubmitting ? STRINGS.LETTER_SAVING : STRINGS.LETTER_SUBMIT}
      </button>
    </div>
  );
}
