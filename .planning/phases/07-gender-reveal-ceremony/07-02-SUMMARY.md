---
phase: 07-gender-reveal-ceremony
plan: 02
subsystem: ui, hooks
tags: [react, motion, signalr, css-variables, gender-reveal, ceremony-animation]

# Dependency graph
requires:
  - phase: 07-gender-reveal-ceremony
    provides: Backend API routes, shared types, SignalR events from Plan 01
  - phase: 03-real-time
    provides: SignalR context, useSignalREvent hook, connection management
  - phase: 02-envelope-system
    provides: BaseEnvelope component, envelope type switch pattern
provides:
  - useGenderReveal state machine hook with full phase transitions and SignalR
  - KeyEntryPhase segmented code input with shake animation
  - WaitingPhase glowing anticipation with pulsing radial gradient
  - CeremonyPhase full-screen reveal animation with gender-themed colors
  - KeepsakePhase screenshot-worthy post-reveal static view
  - GenderRevealActivity orchestrator wired into BaseEnvelope
  - Gender reveal CSS color tokens (boy: sky/sage, girl: warm rose)
  - REVEAL_* string constants and animation timing constants
  - getGenderRevealState and validateRevealKey API client functions
affects: [07-03 admin content tab, 07-04 testing and integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Full-screen ceremony overlay via position:fixed for dramatic effect"
    - "Error string as motion key for shake-on-error animation remount"
    - "Hidden input technique for segmented code entry (accessibility)"
    - "Gender-themed CSS custom properties for boy/girl color variants"

key-files:
  created:
    - client/src/hooks/useGenderReveal.ts
    - client/src/components/activities/GenderReveal/GenderRevealActivity.tsx
    - client/src/components/activities/GenderReveal/GenderRevealActivity.css
    - client/src/components/activities/GenderReveal/KeyEntryPhase.tsx
    - client/src/components/activities/GenderReveal/KeyEntryPhase.css
    - client/src/components/activities/GenderReveal/WaitingPhase.tsx
    - client/src/components/activities/GenderReveal/WaitingPhase.css
    - client/src/components/activities/GenderReveal/CeremonyPhase.tsx
    - client/src/components/activities/GenderReveal/CeremonyPhase.css
    - client/src/components/activities/GenderReveal/KeepsakePhase.tsx
    - client/src/components/activities/GenderReveal/KeepsakePhase.css
  modified:
    - client/src/services/api.ts
    - client/src/constants/strings.ts
    - client/src/constants/animation.ts
    - client/src/styles/variables.css
    - client/src/components/envelope/BaseEnvelope.tsx

key-decisions:
  - "Error string as motion key: Using the error prop value as key remounts the motion container, re-triggering shake animation without ref-during-render violations"
  - "onComplete ref updated in useEffect: React 19 ESLint rules disallow ref writes during render, moved to effect"
  - "Gender reveal never completes: Same pattern as name-game, no onComplete prop passed from BaseEnvelope"
  - "Full-screen fixed overlay for ceremony: CeremonyPhase uses position:fixed z-index:1000 to render above everything"

patterns-established:
  - "Full-screen overlay ceremony: position:fixed with z-index above all other UI for dramatic reveals"
  - "Segmented input via hidden input: Single real input for a11y, visual boxes purely presentational"
  - "Phase-based activity orchestrator: Switch on hook phase state for component selection"

# Metrics
duration: 12min
completed: 2026-02-20
---

# Phase 7 Plan 2: Gender Reveal Client UI Summary

**Complete gender reveal participant UI with segmented key entry, glowing anticipation, full-screen ceremony animation using Golden Hour color themes, and screenshot-worthy keepsake view -- all synced via SignalR**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-20T21:12:05Z
- **Completed:** 2026-02-20T22:09:40Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- State machine hook (useGenderReveal) managing all phase transitions with SignalR integration for two-device ceremony coordination
- Ceremonial segmented code input with hidden input technique for accessibility, auto-submit, and shake-on-error animation
- Full-screen ceremony animation with multi-stage glow bloom sequence (buildup -> bloom -> text -> settle) using gender-themed Golden Hour colors
- Screenshot-worthy keepsake view with gender result, warm message, and reveal date
- Gender reveal wired into BaseEnvelope -- envelope never completes (stays opened forever)
- Complete set of REVEAL_* string constants, animation timing constants, and CSS color tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: API functions, constants, CSS tokens, and useGenderReveal hook** - `2684ee7` (feat)
2. **Task 2: Phase components, orchestrator, and BaseEnvelope wiring** - `5446d9a` (feat)

## Files Created/Modified
- `client/src/hooks/useGenderReveal.ts` - State machine hook with SignalR, key validation, phase management
- `client/src/services/api.ts` - Added getGenderRevealState and validateRevealKey functions
- `client/src/constants/strings.ts` - Added all REVEAL_* strings (participant and admin)
- `client/src/constants/animation.ts` - Added REVEAL_* timing constants for ceremony sequence
- `client/src/styles/variables.css` - Added --reveal-boy-* and --reveal-girl-* CSS tokens
- `client/src/components/activities/GenderReveal/KeyEntryPhase.tsx` - Segmented code input with shake animation
- `client/src/components/activities/GenderReveal/KeyEntryPhase.css` - Ceremonial input styling
- `client/src/components/activities/GenderReveal/WaitingPhase.tsx` - Glowing anticipation with pulsing gradient
- `client/src/components/activities/GenderReveal/WaitingPhase.css` - Radial gradient pulse styling
- `client/src/components/activities/GenderReveal/CeremonyPhase.tsx` - Full-screen reveal animation
- `client/src/components/activities/GenderReveal/CeremonyPhase.css` - Fixed overlay, glow, themed text
- `client/src/components/activities/GenderReveal/KeepsakePhase.tsx` - Static post-reveal view
- `client/src/components/activities/GenderReveal/KeepsakePhase.css` - Soft gradient, Fraunces typography
- `client/src/components/activities/GenderReveal/GenderRevealActivity.tsx` - Phase orchestrator
- `client/src/components/activities/GenderReveal/GenderRevealActivity.css` - Loading/not-configured states
- `client/src/components/envelope/BaseEnvelope.tsx` - Added gender-reveal case (no onComplete)

## Decisions Made
- **Error string as motion key:** The error prop value itself is used as the key for the motion container holding the character boxes. When error changes, the container remounts, re-triggering the shake initial animation. This avoids ref-during-render violations from React 19 ESLint rules while still providing the shake-on-error UX.
- **onComplete ref update in useEffect:** React 19 strict ESLint rules (`react-hooks/refs`) disallow writing to refs during render. The CeremonyPhase callback ref is updated via a dedicated useEffect instead of inline assignment.
- **No onComplete for gender reveal:** Following the name-game pattern, gender reveal envelopes never transition to 'completed'. The BaseEnvelope wiring passes no onComplete prop, so the envelope stays in 'opened' status forever.
- **Full-screen fixed overlay:** The CeremonyPhase renders with `position: fixed` and `z-index: 1000` to overlay the entire screen including the BaseEnvelope chrome. This ensures the ceremony is unobstructed and feels like the most dramatic moment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ref-during-render ESLint violations**
- **Found during:** Task 2 (commit pre-commit hook)
- **Issue:** React 19 ESLint rule `react-hooks/refs` disallows accessing/writing refs during render. CeremonyPhase had `onCompleteRef.current = onComplete` in render body. KeyEntryPhase had `prevErrorRef.current` reads/writes in render body.
- **Fix:** CeremonyPhase: moved ref update to useEffect. KeyEntryPhase: replaced ref-based error tracking with error string as motion key, and moved input clear to useEffect.
- **Files modified:** CeremonyPhase.tsx, KeyEntryPhase.tsx
- **Verification:** ESLint passes, all tests pass
- **Committed in:** 5446d9a (Task 2 commit)

**2. [Rule 1 - Bug] Fixed setState-in-effect ESLint violation**
- **Found during:** Task 2 (second commit attempt)
- **Issue:** React ESLint rule `react-hooks/set-state-in-effect` disallows calling setState synchronously in effect body. KeyEntryPhase had `setShakeKey` inside useEffect.
- **Fix:** Removed shakeKey state entirely, used the error prop string as the motion container key instead (parent re-render from error change naturally remounts the component).
- **Files modified:** KeyEntryPhase.tsx
- **Verification:** ESLint passes, all tests pass
- **Committed in:** 5446d9a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs - ESLint rule violations)
**Impact on plan:** Both fixes required for linting to pass. Improved patterns align with React 19 best practices. No scope creep.

## Issues Encountered
- Pre-existing type errors in untracked test files (not from this plan) caused `tsc -b` to fail, but `vite build` succeeds and all existing tests pass. The test files were already in git's untracked list before execution began.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete participant-facing gender reveal UI accessible through envelope system
- API client functions ready for admin content tab (Plan 03)
- All REVEAL_ADMIN_* string constants pre-defined for admin UI
- Ceremony animation constants and CSS tokens established for any future tuning
- BaseEnvelope wiring complete -- gender reveal envelopes render GenderRevealActivity

---
*Phase: 07-gender-reveal-ceremony*
*Completed: 2026-02-20*
