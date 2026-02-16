---
phase: 05-baby-name-game-ai
plan: 03
subsystem: ui
tags: [react, motion, use-gesture, swipe, css-variables, name-game, animation]

# Dependency graph
requires:
  - phase: 05-01
    provides: Shared types (GeneratedName, NameVoteState, NameVoteChoice, NameGameResults)
provides:
  - Six React UI components for Name Game (NameCard, VotingPhase, WaitingPhase, ResultsPhase, NewRoundPhase, GeneratingPhase)
  - Barrel export at client/src/components/activities/NameGame/index.ts
  - NAME_GAME_* string constants
  - Name card animation constants
affects: [05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Swipe card gesture: useDrag on wrapper div, motion.div for animation"
    - "Directional overlays: opacity-based drag feedback (gold/sage/muted)"
    - "Result categorization: matches/near-misses/worth-discussing sections"

key-files:
  created:
    - client/src/components/activities/NameGame/NameCard.tsx
    - client/src/components/activities/NameGame/NameCard.css
    - client/src/components/activities/NameGame/VotingPhase.tsx
    - client/src/components/activities/NameGame/VotingPhase.css
    - client/src/components/activities/NameGame/WaitingPhase.tsx
    - client/src/components/activities/NameGame/WaitingPhase.css
    - client/src/components/activities/NameGame/ResultsPhase.tsx
    - client/src/components/activities/NameGame/ResultsPhase.css
    - client/src/components/activities/NameGame/NewRoundPhase.tsx
    - client/src/components/activities/NameGame/NewRoundPhase.css
    - client/src/components/activities/NameGame/GeneratingPhase.tsx
    - client/src/components/activities/NameGame/GeneratingPhase.css
    - client/src/components/activities/NameGame/index.ts
  modified:
    - client/src/constants/strings.ts
    - client/src/constants/animation.ts

key-decisions:
  - "Directional overlay feedback using radial gradients with opacity"
  - "ResultSection as internal sub-component for DRY match/near-miss/worth-discussing rendering"

patterns-established:
  - "ng-* BEM prefix for Name Game CSS classes"
  - "PULSE_OPACITY_RANGE reuse for consistent breathing animations across activities"

# Metrics
duration: 7min
completed: 2026-02-15
---

# Phase 5 Plan 3: Name Game UI Components Summary

**Swipeable name card voting (Love/Maybe/Nope) with results categorization, generating state, and new round guidance input**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-16T02:39:22Z
- **Completed:** 2026-02-16T02:46:33Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- NameCard with directional drag overlays (gold for Love, muted for Nope, sage for Maybe)
- VotingPhase with useDrag gesture detection for three-direction swipe voting
- ResultsPhase with categorized sections: matches (gold glow), near-misses (sage border), worth-discussing (muted)
- GeneratingPhase with warm breathing animation during AI name generation
- NewRoundPhase with optional free-text guidance for subsequent rounds
- WaitingPhase following WYR breathing animation pattern
- All strings centralized in NAME_GAME_* constants

## Task Commits

Each task was committed atomically:

1. **Task 1: NameCard, VotingPhase, GeneratingPhase with swipe gestures** - `11dca11` (feat)
2. **Task 2: Results, Waiting, NewRound phases and barrel export** - `c309711` (included in prior docs commit via lint-staged stash)

## Files Created/Modified
- `client/src/components/activities/NameGame/NameCard.tsx` - Name card with drag feedback overlays
- `client/src/components/activities/NameGame/NameCard.css` - Card styling with directional gradients
- `client/src/components/activities/NameGame/VotingPhase.tsx` - Swipe card interface with useDrag
- `client/src/components/activities/NameGame/VotingPhase.css` - Card area, progress bar, hints
- `client/src/components/activities/NameGame/GeneratingPhase.tsx` - Warm loading state
- `client/src/components/activities/NameGame/GeneratingPhase.css` - Centered pulsing layout
- `client/src/components/activities/NameGame/WaitingPhase.tsx` - Partner waiting screen
- `client/src/components/activities/NameGame/WaitingPhase.css` - Breathing animation layout
- `client/src/components/activities/NameGame/ResultsPhase.tsx` - Match results with categories
- `client/src/components/activities/NameGame/ResultsPhase.css` - Gold glow, sage, muted variants
- `client/src/components/activities/NameGame/NewRoundPhase.tsx` - Guidance input for next round
- `client/src/components/activities/NameGame/NewRoundPhase.css` - Textarea and button styling
- `client/src/components/activities/NameGame/index.ts` - Barrel export for all 6 components
- `client/src/constants/strings.ts` - Added 16 NAME_GAME_* string constants
- `client/src/constants/animation.ts` - Added name card animation constants

## Decisions Made
- Directional overlay feedback via radial gradients with opacity tied to drag distance (max 0.35 opacity)
- ResultSection as internal sub-component in ResultsPhase for DRY rendering across match categories
- Card rotation follows horizontal drag (0.05 multiplier) for natural feel
- Reused PULSE_OPACITY_RANGE and WYR_MATCH_GLOW_DURATION_MS for consistency across activities
- 500ms setTimeout for card exit animation before triggering onVote callback

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in test files (useEnvelopes.test.ts, useHaptics.test.ts, useMediaLibrary.test.ts) cause `tsc -b` to fail but don't affect production code or vite build
- Task 2 files were included in the prior plan's docs commit (c309711) due to lint-staged stash/restore during commit hooks

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 UI components ready for orchestration by useNameGame hook and NameGameActivity in Plan 04
- Components use shared types from 05-01 and will connect to API routes from 05-02
- No blockers for Plan 04

---
*Phase: 05-baby-name-game-ai*
*Completed: 2026-02-15*
