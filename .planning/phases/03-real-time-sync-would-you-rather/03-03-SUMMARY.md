---
phase: 03-real-time-sync-would-you-rather
plan: 03
subsystem: ui
tags: [wyr, react, motion, use-gesture, swipe, animation]

# Dependency graph
requires:
  - phase: 03-01
    provides: SignalR context, useSignalREvent hook
  - phase: 03-02
    provides: WYR types (WYRChoice, WYRResults, PartnerPresenceMessage)
provides:
  - PartnerPresence component with online/offline indicator and toast notifications
  - VotingPhase component with swipe-to-vote gesture
  - WaitingPhase component for partner wait screen
  - RevealPhase component with side-by-side reveal and match celebration
  - WYR UI strings and animation constants
affects: [03-04, future-activities]

# Tech tracking
tech-stack:
  added: []
  patterns: [swipe-gesture-with-motion, phase-based-activity-ui]

key-files:
  created:
    - client/src/components/activities/WouldYouRather/PartnerPresence.tsx
    - client/src/components/activities/WouldYouRather/PartnerPresence.css
    - client/src/components/activities/WouldYouRather/VotingPhase.tsx
    - client/src/components/activities/WouldYouRather/VotingPhase.css
    - client/src/components/activities/WouldYouRather/WaitingPhase.tsx
    - client/src/components/activities/WouldYouRather/WaitingPhase.css
    - client/src/components/activities/WouldYouRather/RevealPhase.tsx
    - client/src/components/activities/WouldYouRather/RevealPhase.css
    - client/src/components/activities/WouldYouRather/index.ts
  modified:
    - client/src/constants/strings.ts
    - client/src/constants/animation.ts

key-decisions:
  - "Applied bind() to container div (not motion.div) to avoid useDrag onDrag type conflict with motion"
  - "Match celebration uses glow effect instead of confetti (per 03-CONTEXT intimate aesthetic)"
  - "Waiting phase hides user choice to maintain anticipation"

patterns-established:
  - "Pattern: Gesture handler on wrapper div, animation on inner motion.div"
  - "Pattern: Phase-based activity component structure (Voting/Waiting/Reveal)"
  - "Pattern: Toast notification with auto-dismiss for partner presence"

# Metrics
duration: 61min
completed: 2026-02-06
---

# Phase 03 Plan 03: WYR UI Components Summary

**Four WYR activity phase components with swipe-to-vote, partner presence indicator, waiting screen, and reveal with match celebration glow**

## Performance

- **Duration:** 61 min
- **Started:** 2026-02-06T19:37:08Z
- **Completed:** 2026-02-06T20:38:30Z
- **Tasks:** 3
- **Files created:** 9
- **Files modified:** 2

## Accomplishments

- Created PartnerPresence component with green/gray online status dot and toast notifications
- Built VotingPhase with swipe-to-vote using @use-gesture/react, threshold/velocity detection
- Implemented WaitingPhase that shows pulsing "Waiting for [Partner]..." without revealing choice
- Created RevealPhase with staggered side-by-side reveal and match celebration glow effect
- All components exported from index.ts for easy import
- Added WYR-specific animation constants and UI strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PartnerPresence component** - `2fda418` (feat)
2. **Task 2: Create VotingPhase with swipe gesture** - `a7da1a9` (feat)
3. **Task 3: Create WaitingPhase and RevealPhase** - `454bf2f` (feat)

## Files Created/Modified

**Created:**
- `client/src/components/activities/WouldYouRather/PartnerPresence.tsx` - Online/offline indicator with toast
- `client/src/components/activities/WouldYouRather/PartnerPresence.css` - Presence indicator styling
- `client/src/components/activities/WouldYouRather/VotingPhase.tsx` - Swipe-to-vote card component
- `client/src/components/activities/WouldYouRather/VotingPhase.css` - Options and card styling
- `client/src/components/activities/WouldYouRather/WaitingPhase.tsx` - Wait screen with pulse animation
- `client/src/components/activities/WouldYouRather/WaitingPhase.css` - Waiting phase styling
- `client/src/components/activities/WouldYouRather/RevealPhase.tsx` - Side-by-side reveal with match glow
- `client/src/components/activities/WouldYouRather/RevealPhase.css` - Reveal styling with celebration
- `client/src/components/activities/WouldYouRather/index.ts` - Barrel export for all components

**Modified:**
- `client/src/constants/strings.ts` - Added WYR_PARTNER_*, WYR_SWIPE_*, WYR_WAITING, WYR_*_CHOICE strings
- `client/src/constants/animation.ts` - Added WYR swipe threshold, card spring, reveal timing constants

## Decisions Made

1. **Container wrapper for gesture binding** - Applied useDrag bind() to a regular div container rather than motion.div to avoid TypeScript conflict between @use-gesture onDrag and motion's onDrag prop types. Inner motion.div handles animation separately.

2. **Glow effect for match celebration** - Per 03-CONTEXT.md guidance that celebration should be "noticeable but not over-the-top" and fit the intimate aesthetic, used animated text-shadow glow instead of confetti.

3. **Waiting phase hides choice** - User's own vote is not displayed during waiting phase to maintain anticipation for the reveal moment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript conflict between useDrag and motion.div**
- **Found during:** Task 2
- **Issue:** useDrag returns an onDrag prop that conflicts with motion.div's built-in onDrag type signature
- **Fix:** Applied pattern from existing EnvelopePile - bind() on wrapper div, motion.div inside for animation
- **Files modified:** VotingPhase.tsx, VotingPhase.css
- **Verification:** Build and lint pass

---

**Total deviations:** 1 blocking fix
**Impact on plan:** No scope creep. Fix followed existing codebase pattern.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four WYR UI components complete and exported
- Ready for 03-04 (useWouldYouRather hook to wire components together)
- Components use design system tokens and follow established patterns
- Integration with SignalR events via useSignalREvent hook is ready

---
*Phase: 03-real-time-sync-would-you-rather*
*Completed: 2026-02-06*
