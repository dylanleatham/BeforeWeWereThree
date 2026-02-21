import { useState, useCallback } from 'react';
import type { GenderValue } from 'shared';
import { Button, Card, Heading, Text } from '../common';
import { setGender } from '../../services/friendApi';
import { STRINGS } from '../../constants/strings';
import './GenderInput.css';

interface GenderInputProps {
  genderAlreadySet: boolean;
  onGenderSet: () => void;
}

/**
 * Gender input component for the gender keeper friend
 * Two states: input (select boy/girl + confirm) and done (warm thank-you)
 * One-time action — after submission, shows permanent done state
 */
export function GenderInput({ genderAlreadySet, onGenderSet }: GenderInputProps) {
  const [selectedGender, setSelectedGender] = useState<GenderValue | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(genderAlreadySet);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = useCallback((gender: GenderValue) => {
    setSelectedGender(gender);
    setIsConfirming(true);
    setError(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedGender) return;

    setIsSaving(true);
    setError(null);
    try {
      await setGender({ genderValue: selectedGender });
      setIsDone(true);
      onGenderSet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set gender');
    } finally {
      setIsSaving(false);
    }
  }, [selectedGender, onGenderSet]);

  const handleCancel = useCallback(() => {
    setIsConfirming(false);
    setSelectedGender(null);
    setError(null);
  }, []);

  // Done state — warm thank-you, no value shown
  if (isDone) {
    return (
      <Card className="gender-input gender-input--done">
        <Heading level={3} className="gender-input__title">
          {STRINGS.GENDER_KEEPER_DONE_TITLE}
        </Heading>
        <Text color="muted" className="gender-input__message">
          {STRINGS.GENDER_KEEPER_DONE_MESSAGE}
        </Text>
      </Card>
    );
  }

  // Confirmation dialog
  if (isConfirming && selectedGender) {
    return (
      <Card className="gender-input gender-input--confirming">
        <Heading level={3} className="gender-input__title">
          {STRINGS.GENDER_KEEPER_CONFIRM_TITLE}
        </Heading>
        <Text className="gender-input__message">
          {STRINGS.GENDER_KEEPER_CONFIRM_MESSAGE(selectedGender === 'boy' ? 'Boy' : 'Girl')}
        </Text>
        {error && (
          <div className="gender-input__error" role="alert">{error}</div>
        )}
        <div className="gender-input__actions">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {STRINGS.REVEAL_ADMIN_CANCEL}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isSaving}
          >
            {isSaving ? STRINGS.REVEAL_ADMIN_SAVING : STRINGS.GENDER_KEEPER_CONFIRM_YES}
          </Button>
        </div>
      </Card>
    );
  }

  // Input state — Boy/Girl buttons
  return (
    <Card className="gender-input">
      <Heading level={3} className="gender-input__title">
        {STRINGS.GENDER_KEEPER_HEADING}
      </Heading>
      <Text color="muted" className="gender-input__description">
        {STRINGS.GENDER_KEEPER_DESCRIPTION}
      </Text>
      <div className="gender-input__options">
        <button
          type="button"
          className="gender-input__option gender-input__option--boy"
          onClick={() => handleSelect('boy')}
        >
          Boy
        </button>
        <button
          type="button"
          className="gender-input__option gender-input__option--girl"
          onClick={() => handleSelect('girl')}
        >
          Girl
        </button>
      </div>
    </Card>
  );
}
