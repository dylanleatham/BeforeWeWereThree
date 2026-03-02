import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { usePhotoPrompt } from '../../../hooks/usePhotoPrompt';
import { PartnerPresence } from '../WouldYouRather/PartnerPresence';
import { CapturingPhase } from './CapturingPhase';
import { WaitingPhase } from './WaitingPhase';
import { CompletePhase } from './CompletePhase';
import { STRINGS } from '../../../constants/strings';
import './PhotoPromptActivity.css';

interface PhotoPromptActivityProps {
  envelopeId: string;
  onComplete: () => void;
}

/**
 * Main Photo Prompt activity component
 *
 * Orchestrates the photo prompt experience:
 * 1. Loading state while fetching prompt
 * 2. CapturingPhase - upload a photo response
 * 3. WaitingPhase - waiting for partner's photo
 * 4. CompletePhase - keepsake view with both photos
 */
export function PhotoPromptActivity({ envelopeId, onComplete }: PhotoPromptActivityProps) {
  const {
    prompt,
    phase,
    myResponse,
    partnerResponse,
    isLoading,
    error,
    submitPhoto,
    retry,
  } = usePhotoPrompt({ envelopeId });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (photoUrl: string) => {
    setIsSubmitting(true);
    try {
      await submitPhoto(photoUrl);
    } finally {
      setIsSubmitting(false);
    }
  }, [submitPhoto]);

  const handleClose = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Loading state
  if (isLoading) {
    return (
      <div className="photo-prompt-activity photo-prompt-activity--loading">
        <motion.div
          className="photo-prompt-activity__spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          aria-label="Loading activity"
        />
      </div>
    );
  }

  // Error state
  if (error || !prompt) {
    return (
      <div className="photo-prompt-activity photo-prompt-activity--error">
        <p className="photo-prompt-activity__error-message">
          {error || STRINGS.PHOTO_PROMPT_ERROR_LOADING}
        </p>
        <button className="photo-prompt-activity__retry" onClick={retry}>
          {STRINGS.APP_RETRY}
        </button>
      </div>
    );
  }

  const renderPhase = () => {
    switch (phase) {
      case 'capturing':
        return (
          <CapturingPhase
            envelopeId={envelopeId}
            promptText={prompt.prompt}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );

      case 'waiting':
        return (
          <WaitingPhase
            photoUrl={myResponse?.photoUrl ?? ''}
            partnerName="Partner"
          />
        );

      case 'complete':
        if (!myResponse || !partnerResponse) return null;
        return (
          <CompletePhase
            promptText={prompt.prompt}
            myResponse={myResponse}
            partnerResponse={partnerResponse}
            onClose={handleClose}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="photo-prompt-activity">
      <header className="photo-prompt-activity__header">
        <PartnerPresence partnerName="Partner" />
      </header>

      <motion.div
        className="photo-prompt-activity__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        key={phase}
      >
        {renderPhase()}
      </motion.div>

      {/* SignalR connection status is only relevant for partner notifications,
         not for photo upload/persistence which uses HTTP. Removed misleading
         offline notice that implied photos wouldn't be saved. */}
    </div>
  );
}
