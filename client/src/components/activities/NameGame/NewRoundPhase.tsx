import { useState } from 'react';
import { motion } from 'motion/react';
import type { GeneratedName } from 'shared';
import { STRINGS } from '../../../constants/strings';
import { GUIDANCE_MAX_LENGTH } from '../../../constants/config';
import './NewRoundPhase.css';

interface NewRoundPhaseProps {
  /** Callback to start a new round with optional guidance */
  onStartRound: (guidance?: string) => void;
  /** Whether this is the first round (no guidance input shown) */
  isFirstRound: boolean;
  /** Accumulated matched names across all rounds */
  allMatches?: GeneratedName[];
  /** Whether the partner has already submitted their guidance */
  partnerGuidanceSubmitted?: boolean;
}

/**
 * New round phase allowing users to start name generation.
 *
 * - First round: just a "Generate Names" button
 * - Subsequent rounds: textarea for free-text guidance + button
 * - Shows accumulated matches if any exist
 */
export function NewRoundPhase({ onStartRound, isFirstRound, allMatches = [], partnerGuidanceSubmitted = false }: NewRoundPhaseProps) {
  const [guidance, setGuidance] = useState('');
  const hasMatches = allMatches.length > 0;

  const handleStart = () => {
    const trimmed = guidance.trim();
    onStartRound(trimmed || undefined);
  };

  return (
    <div className="ng-new-round">
      <motion.div
        className="ng-new-round__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {!isFirstRound && (
          <>
            <h3 className="ng-new-round__title">
              {STRINGS.NAME_GAME_NEW_ROUND_TITLE}
            </h3>

            <textarea
              className="ng-new-round__guidance"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder={STRINGS.NAME_GAME_NEW_ROUND_PLACEHOLDER}
              maxLength={GUIDANCE_MAX_LENGTH}
              rows={3}
              aria-label={STRINGS.NAME_GAME_NEW_ROUND_TITLE}
            />
          </>
        )}

        {/* Partner guidance indicator (Round 2+ only) */}
        {!isFirstRound && partnerGuidanceSubmitted && (
          <p className="ng-new-round__partner-indicator">
            {STRINGS.NAME_GAME_PARTNER_SUBMITTED}
          </p>
        )}

        <button
          type="button"
          className="ng-new-round__button"
          onClick={handleStart}
        >
          {isFirstRound ? STRINGS.NAME_GAME_START_ROUND : STRINGS.NAME_GAME_SUBMIT_GUIDANCE}
        </button>

        {/* Accumulated matches */}
        {hasMatches && (
          <div className="ng-new-round__matches">
            <h4 className="ng-new-round__matches-title">
              {STRINGS.NAME_GAME_ALL_MATCHES_TITLE}
            </h4>
            <div className="ng-new-round__matches-list">
              {allMatches.map((name) => (
                <span key={name.id} className="ng-new-round__match-name">
                  {name.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
