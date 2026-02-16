import { motion } from 'motion/react';
import type { NameGameResults, GeneratedName } from 'shared';
import { STRINGS } from '../../../constants/strings';
import {
  NAME_GAME_RESULT_STAGGER_S,
  NAME_GAME_RESULT_ENTER_DURATION_S,
  WYR_MATCH_GLOW_DURATION_MS,
} from '../../../constants/animation';
import './ResultsPhase.css';

interface ResultsPhaseProps {
  /** Results for the current round */
  results: NameGameResults;
  /** Callback to start a new round */
  onNewRound: () => void;
  /** Accumulated matches across all rounds */
  allMatches: GeneratedName[];
}

/**
 * Results phase showing match categories after both partners vote.
 *
 * Layout sections (in order):
 * 1. Matches (both loved) - highlighted with warm gold glow
 * 2. Near Misses (one loved + one maybe) - softer styling
 * 3. Worth Discussing (both said maybe) - muted warm tones
 * 4. All Matches (accumulated across rounds) - if any exist
 *
 * If no matches, shows near-misses with encouraging messaging.
 */
export function ResultsPhase({ results, onNewRound, allMatches }: ResultsPhaseProps) {
  const hasMatches = results.matches.length > 0;
  const hasNearMisses = results.nearMisses.length > 0;
  const hasWorthDiscussing = results.worthDiscussing.length > 0;
  const hasAllMatches = allMatches.length > 0;

  return (
    <div className="ng-results">
      {/* Matches section */}
      {hasMatches && (
        <ResultSection
          title={STRINGS.NAME_GAME_MATCHES_TITLE}
          names={results.matches}
          variant="match"
          startIndex={0}
        />
      )}

      {/* No matches message */}
      {!hasMatches && (hasNearMisses || hasWorthDiscussing) && (
        <motion.p
          className="ng-results__no-matches"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {STRINGS.NAME_GAME_NO_MATCHES}
        </motion.p>
      )}

      {/* Near misses section */}
      {hasNearMisses && (
        <ResultSection
          title={STRINGS.NAME_GAME_NEAR_MISSES_TITLE}
          names={results.nearMisses}
          variant="near-miss"
          startIndex={results.matches.length}
        />
      )}

      {/* Worth discussing section */}
      {hasWorthDiscussing && (
        <ResultSection
          title={STRINGS.NAME_GAME_WORTH_DISCUSSING_TITLE}
          names={results.worthDiscussing}
          variant="worth-discussing"
          startIndex={results.matches.length + results.nearMisses.length}
        />
      )}

      {/* All matches across rounds */}
      {hasAllMatches && (
        <div className="ng-results__all-matches">
          <h4 className="ng-results__section-title ng-results__section-title--all">
            {STRINGS.NAME_GAME_ALL_MATCHES_TITLE}
          </h4>
          <div className="ng-results__all-matches-list">
            {allMatches.map((name) => (
              <span key={name.id} className="ng-results__all-match-name">
                {name.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* New round button */}
      <motion.button
        className="ng-results__new-round"
        onClick={onNewRound}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        {STRINGS.NAME_GAME_NEW_ROUND_TITLE}
      </motion.button>
    </div>
  );
}

/* =============================================================================
 * Result Section Sub-component
 * ============================================================================= */

interface ResultSectionProps {
  title: string;
  names: GeneratedName[];
  variant: 'match' | 'near-miss' | 'worth-discussing';
  startIndex: number;
}

function ResultSection({ title, names, variant, startIndex }: ResultSectionProps) {
  return (
    <div className={`ng-results__section ng-results__section--${variant}`}>
      <h3 className={`ng-results__section-title ng-results__section-title--${variant}`}>
        {title}
      </h3>
      <div className="ng-results__name-list">
        {names.map((name, i) => (
          <motion.div
            key={name.id}
            className={`ng-results__name-card ng-results__name-card--${variant}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: NAME_GAME_RESULT_ENTER_DURATION_S,
              delay: (startIndex + i) * NAME_GAME_RESULT_STAGGER_S,
            }}
          >
            <motion.span
              className="ng-results__name-text"
              animate={
                variant === 'match'
                  ? {
                      textShadow: [
                        '0 0 0px var(--color-sunrise-gold)',
                        '0 0 15px var(--color-sunrise-gold)',
                        '0 0 0px var(--color-sunrise-gold)',
                      ],
                    }
                  : undefined
              }
              transition={
                variant === 'match'
                  ? {
                      duration: WYR_MATCH_GLOW_DURATION_MS / 1000,
                      repeat: 2,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
            >
              {name.name}
            </motion.span>
            <span className="ng-results__name-origin">{name.origin.join(', ')}</span>
            <span className="ng-results__name-meaning">{name.meaning}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
