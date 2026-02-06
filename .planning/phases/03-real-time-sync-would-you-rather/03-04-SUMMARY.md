---
phase: 03-real-time-sync-would-you-rather
plan: 04
subsystem: integration
tags: [wyr, integration, signalr, hooks, testing]

# Dependency graph
requires:
  - phase: 03-01
    provides: SignalR context, useSignalREvent hook, REST API client
  - phase: 03-02
    provides: WYR data model, API routes, vote/reveal logic
  - phase: 03-03
    provides: VotingPhase, WaitingPhase, RevealPhase, PartnerPresence components
provides:
  - useWouldYouRather hook with full state machine and SignalR integration
  - WouldYouRatherActivity component orchestrating all phases
  - Client API methods for WYR (getWyrPrompt, submitWyrVote, etc.)
  - Graceful degradation when SignalR unavailable
  - Guest-accessible envelope open endpoint
affects: [future-activities]

# Tech tracking
tech-stack:
  added: []
  patterns: [graceful-offline-degradation, guest-vs-admin-endpoints]

key-files:
  created:
    - client/src/hooks/useWouldYouRather.ts
    - client/src/components/activities/WouldYouRather/WouldYouRatherActivity.tsx
    - client/src/components/activities/WouldYouRather/WouldYouRatherActivity.css
    - server/src/routes/envelopeOpen.ts
  modified:
    - client/src/services/api.ts
    - client/src/components/envelope/BaseEnvelope.tsx
    - client/src/components/envelope/EnvelopePile.tsx
    - client/src/components/envelope/EnvelopeCard.tsx
    - client/src/components/activities/WouldYouRather/VotingPhase.tsx
    - client/src/components/activities/WouldYouRather/VotingPhase.css
    - client/src/components/activities/WouldYouRather/index.ts
    - client/src/constants/strings.ts
    - server/src/index.ts

key-decisions:
  - "Graceful degradation: voting works without SignalR, real-time sync is enhancement only"
  - "Guest vs Admin endpoints: guests use POST /envelopes/:id/open, admin uses PATCH /envelopes/:id"
  - "VotingPhase redesign: options visible upfront, swipe handle below for choosing"
  - "Opened envelopes navigable: status !== 'completed' check instead of status === 'sealed'"

patterns-established:
  - "Pattern: Offline-first API calls, SignalR for real-time enhancement"
  - "Pattern: Role-specific endpoints (guest open vs admin update)"
  - "Pattern: UX principle - show all info needed for decisions upfront"

lessons-learned:
  - "Envelope type uses hyphens not underscores: 'would-you-rather' not 'would_you_rather'"
  - "Guests need dedicated endpoints - PATCH requires admin role"
  - "SignalR 503 errors expected without Azure SignalR configured"
  - "Activities must work offline - never block UI waiting for SignalR"
  - "Opened envelopes must be navigable for in-progress activities"
  - "WYR options must be visible before choosing (UX principle)"
  - "Prisma camelCase vs DB snake_case - use @map() directives"
  - "WYR requires two participants - waiting is expected behavior"
  - "WYR prompt needs actual content (optionA, optionB text)"

# Metrics
duration: 119min
completed: 2026-02-06
---

# Phase 03 Plan 04: WYR Integration Summary

**Full end-to-end Would You Rather activity with real-time sync, graceful offline degradation, and UX improvements from manual testing**

## Performance

- **Duration:** 119 min (includes extensive manual testing and bug fixes)
- **Started:** 2026-02-06
- **Completed:** 2026-02-06
- **Tasks:** 3 planned + 5 bug fixes from testing
- **Files created:** 4
- **Files modified:** 12

## Accomplishments

- Created useWouldYouRather hook with full state machine (voting/waiting/revealing phases)
- Built WouldYouRatherActivity component orchestrating all phase transitions
- Added WYR API methods to client (getWyrPrompt, submitWyrVote, CRUD operations)
- Integrated WYR activity with BaseEnvelope for 'would-you-rather' type envelopes
- Implemented graceful degradation - activity works without SignalR connected
- Created guest-accessible envelope open endpoint (POST /envelopes/:id/open)
- Enabled navigation to opened (in-progress) envelopes
- Redesigned VotingPhase to show options upfront (UX improvement from testing)
- Documented comprehensive lessons learned for future development

## Task Commits

Each task and fix was committed atomically:

### Planned Tasks
1. **Task 1: Add WYR API methods to client** - `1b119c5` (feat)
2. **Task 2: Create useWouldYouRather hook** - `a1f47b6` (feat)
3. **Task 3: Create WouldYouRatherActivity and integrate** - `6984067` (feat)

### Bug Fixes from Manual Testing
4. **Guest envelope open endpoint** - `dc3d9f3` (fix)
5. **Allow WYR without SignalR** - `0645af6` (fix)
6. **Allow navigating to opened envelopes** - `5f1377e` (feat)
7. **Redesign VotingPhase UI** - `edb94d5` (fix)
8. **Document lessons learned** - `e479a5e` (docs)

## Files Created/Modified

**Created:**
- `client/src/hooks/useWouldYouRather.ts` - State machine hook with SignalR integration
- `client/src/components/activities/WouldYouRather/WouldYouRatherActivity.tsx` - Phase orchestration
- `client/src/components/activities/WouldYouRather/WouldYouRatherActivity.css` - Activity styling
- `server/src/routes/envelopeOpen.ts` - Guest-accessible envelope open endpoint

**Modified:**
- `client/src/services/api.ts` - Added WYR API methods
- `client/src/components/envelope/BaseEnvelope.tsx` - Integrated WYR activity
- `client/src/components/envelope/EnvelopePile.tsx` - Allow clicking opened envelopes
- `client/src/components/envelope/EnvelopeCard.tsx` - Made opened envelopes interactive
- `client/src/components/activities/WouldYouRather/VotingPhase.tsx` - Redesigned UI
- `client/src/components/activities/WouldYouRather/VotingPhase.css` - Updated styling
- `client/src/components/activities/WouldYouRather/index.ts` - Added activity export
- `client/src/constants/strings.ts` - Added WYR UI strings
- `server/src/index.ts` - Registered envelope open route

## Decisions Made

1. **Graceful offline degradation** - Removed `isConnected` checks from vote handlers. Voting works via API; SignalR provides real-time sync as enhancement. Activities never block UI waiting for WebSocket.

2. **Guest vs Admin endpoints** - PATCH /envelopes/:id requires admin role. Created POST /envelopes/:id/open for guests to open envelopes without admin privileges.

3. **VotingPhase UX redesign** - Original design hid options behind swipe card. Users couldn't read choices before deciding. Redesigned to show both options upfront as visible cards with swipe handle below for making choice.

4. **Opened envelopes navigable** - Changed from `status === 'sealed'` to `status !== 'completed'` in EnvelopePile and EnvelopeCard to allow returning to in-progress activities.

## Deviations from Plan

### Auto-fixed Issues (Rule 1, 3)

**1. Guest envelope access blocked**
- **Found during:** Manual testing
- **Issue:** Guests couldn't open envelopes - PATCH requires admin role
- **Fix:** Created dedicated POST /envelopes/:id/open endpoint with authMiddleware
- **Commit:** dc3d9f3

**2. Activity blocked without SignalR**
- **Found during:** Manual testing (no SIGNALR_CONNECTION_STRING configured)
- **Issue:** `isConnected` check blocked voting when SignalR unavailable
- **Fix:** Removed blocking check, made real-time sync enhancement-only
- **Commit:** 0645af6

**3. Cannot return to opened envelopes**
- **Found during:** Manual testing
- **Issue:** EnvelopePile only allowed clicking sealed envelopes
- **Fix:** Check `status !== 'completed'` instead of `status === 'sealed'`
- **Commit:** 5f1377e

**4. Options not visible before voting**
- **Found during:** Manual testing (user feedback)
- **Issue:** Options hidden behind swipe card - users can't see choices
- **Fix:** Complete VotingPhase redesign - options displayed upfront as visible cards
- **Commit:** edb94d5

---

**Total deviations:** 4 blocking fixes
**Impact on plan:** Significant UX improvements. All fixes discovered during human verification phase.

## Issues Encountered

1. **WYR stuck at "Waiting for Partner"** - Expected behavior, not a bug. WYR requires two participants. Without SignalR configured, no real-time notification when partner votes. Workarounds documented: use two browser windows (different fingerprints) or manually insert partner vote in DB.

2. **SignalR 503 errors in console** - Expected behavior when SIGNALR_CONNECTION_STRING not configured. Real-time features gracefully degrade.

## User Setup Required

For full real-time sync functionality:
- Azure SignalR Service must be configured (see 03-01-USER-SETUP.md)
- SIGNALR_CONNECTION_STRING must be set in environment

Without SignalR configured:
- Voting works via API
- Manual refresh required to see partner's vote
- "Waiting for Partner" requires workaround (two browsers or DB insert)

## Testing Notes

Testing WYR locally without SignalR:
1. Create envelope with type `'would-you-rather'` (hyphens!)
2. Create WYR prompt in database with optionA and optionB text
3. Use two browser windows (normal + incognito) for two participants
4. Or manually insert partner vote via SQL

## Next Phase Readiness

Phase 03 (Real-Time Sync & Would You Rather) is complete:
- SignalR infrastructure operational (03-01)
- WYR data model and API complete (03-02)
- WYR UI components complete (03-03)
- Full integration with graceful degradation (03-04)

Ready for Phase 04 (Letter to Baby).

---
*Phase: 03-real-time-sync-would-you-rather*
*Completed: 2026-02-06*
