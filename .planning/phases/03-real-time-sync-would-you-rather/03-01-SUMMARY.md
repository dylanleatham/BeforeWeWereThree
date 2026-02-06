---
phase: 03-real-time-sync-would-you-rather
plan: 01
subsystem: real-time
tags: [signalr, azure, websocket, react-context, jose, jwt]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Express server, jose JWT library, auth middleware
  - phase: 02-ui-foundation
    provides: React app structure, hooks pattern
provides:
  - POST /api/signalr/negotiate endpoint for token generation
  - SignalRService class for REST API messaging
  - SignalRProvider React context for connection management
  - useSignalREvent hook for event subscriptions
  - SignalR types (SignalRNegotiateResponse, PartnerPresenceMessage, SignalRMessage)
affects: [03-02, 03-03, 03-04, 04-partner-presence, 05-trivia, 06-gender-reveal]

# Tech tracking
tech-stack:
  added: [@microsoft/signalr 8.x]
  patterns: [azure-signalr-rest-api, react-context-provider, ref-based-event-handlers]

key-files:
  created:
    - server/src/routes/signalr.ts
    - server/src/services/signalr.ts
    - shared/types/signalr.ts
    - client/src/context/SignalRContext.tsx
    - client/src/hooks/useSignalREvent.ts
  modified:
    - shared/types/index.ts
    - server/src/index.ts
    - client/src/services/api.ts
    - client/src/constants/strings.ts
    - client/src/App.tsx
    - client/package.json

key-decisions:
  - "Azure SignalR REST API pattern for server-to-client messaging (no Node SDK)"
  - "jose for SignalR JWT token generation (already in project)"
  - "Ref pattern for event handlers to avoid stale closures"
  - "Lazy-initialized SignalR service with graceful degradation when env var missing"

patterns-established:
  - "Pattern: Azure SignalR REST API messaging from Express"
  - "Pattern: SignalRProvider wraps authenticated content"
  - "Pattern: useSignalREvent with ref for stable handlers"

# Metrics
duration: 15min
completed: 2026-02-06
---

# Phase 03 Plan 01: SignalR Infrastructure Summary

**Azure SignalR Service infrastructure with negotiate endpoint, REST API client, React context provider, and event subscription hook**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-06T10:46:00Z
- **Completed:** 2026-02-06T11:01:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Created SignalR negotiate endpoint that generates JWT access tokens for Azure SignalR Service
- Implemented SignalRService class for sending messages via Azure SignalR REST API
- Created SignalRProvider React context managing connection lifecycle with automatic reconnection
- Added useSignalREvent hook with ref pattern to avoid stale closures
- Graceful degradation when SIGNALR_CONNECTION_STRING not set (warns, doesn't crash)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SignalR server infrastructure** - `073bf35` (feat)
   - Note: This commit was made in a prior session with mixed commit message
2. **Task 2: Create client SignalR connection infrastructure** - `51b666d` (feat)

## Files Created/Modified

**Created:**
- `server/src/routes/signalr.ts` - POST /negotiate endpoint with JWT token generation
- `server/src/services/signalr.ts` - SignalRService class for REST API messaging
- `shared/types/signalr.ts` - SignalR type definitions
- `client/src/context/SignalRContext.tsx` - React context for connection management
- `client/src/hooks/useSignalREvent.ts` - Hook for event subscriptions

**Modified:**
- `shared/types/index.ts` - Added SignalR type exports
- `server/src/index.ts` - Mounted signalr router at /api/signalr
- `client/src/services/api.ts` - Added negotiateSignalR function
- `client/src/constants/strings.ts` - Added API error string
- `client/src/App.tsx` - Wrapped AuthenticatedApp with SignalRProvider
- `client/package.json` - Added @microsoft/signalr dependency

## Decisions Made

1. **Azure SignalR REST API pattern** - No Node.js server SDK exists; server uses REST API to send messages while clients use @microsoft/signalr WebSocket client
2. **jose for JWT generation** - Reused existing jose library (already in project for session tokens) for SignalR access token generation
3. **Ref pattern for event handlers** - useSignalREvent uses useRef to keep handler fresh without triggering re-subscription on every render
4. **Lazy singleton service** - SignalRService is lazily initialized from env var to allow graceful degradation in dev/test environments

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prior session mixed commits**
- **Found during:** Task 1 verification
- **Issue:** A prior execution session created commits 073bf35 and b2fc240 containing both 03-01 and 03-02 work mixed together
- **Fix:** Verified Task 1 work was already committed in 073bf35, proceeded with Task 2
- **Files affected:** No new changes needed for Task 1 files
- **Impact:** Task 1 commit has incorrect message referencing 03-02

**2. [Rule 3 - Blocking] Removed orphaned WYR files from future plan**
- **Found during:** Task 2 verification
- **Issue:** The linter/prior session added wyr.ts routes and services that reference types not yet created
- **Fix:** Removed server/src/routes/wyr.ts, cleaned up index.ts imports
- **Files modified:** server/src/index.ts
- **Verification:** Tests pass

---

**Total deviations:** 2 blocking fixes
**Impact on plan:** No scope creep. Fixes necessary to unblock current plan execution due to prior session contamination.

## Issues Encountered

- **Windows Prisma file lock**: `prisma generate` failed with EPERM error during build verification. Worked around by running TypeScript check and esbuild separately (schema is correct, just file lock issue).
- **Test stderr noise**: Client tests log SignalR connection failures (expected - no server in test environment). Tests pass; graceful error handling works correctly.

## User Setup Required

**External services require manual configuration.** See [03-01-USER-SETUP.md](./03-01-USER-SETUP.md) for:
- Azure SignalR Service creation
- SIGNALR_CONNECTION_STRING environment variable
- CORS configuration in Azure portal

## Next Phase Readiness

- SignalR infrastructure complete and tested
- Ready for 03-02 (Would You Rather types and API endpoints)
- No blockers - SIGNALR_CONNECTION_STRING will need to be set before end-to-end testing

---
*Phase: 03-real-time-sync-would-you-rather*
*Completed: 2026-02-06*
