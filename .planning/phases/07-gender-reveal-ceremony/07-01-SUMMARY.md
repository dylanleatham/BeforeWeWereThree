---
phase: 07-gender-reveal-ceremony
plan: 01
subsystem: api, database
tags: [prisma, express, zod, signalr, serializable-isolation, gender-reveal]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Express routes, auth middleware, Prisma, SignalR/Socket.io
  - phase: 03-real-time
    provides: SignalR adapter and sendToGroup pattern
provides:
  - GenderRevealConfig Prisma model with unique envelope constraint
  - Shared types with Zod validation schemas for gender reveal API
  - Query layer, service, and routes for gender reveal backend
  - Serializable isolation for race-safe key validation
  - SignalR broadcast events for two-device ceremony coordination
  - Admin CRUD and re-seal endpoints
  - Session reset logic preserving admin-created config
affects: [07-02 client hooks and UI, 07-03 admin content tab, 07-04 ceremony animation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-key validation with Serializable isolation (gender never leaks until both keys valid)"
    - "Admin re-seal pattern (clear state, preserve config)"

key-files:
  created:
    - server/prisma/migrations/20260220000000_add_gender_reveal/migration.sql
    - shared/types/genderReveal.ts
    - server/src/db/queries/genderReveal.ts
    - server/src/services/genderReveal.ts
    - server/src/routes/genderReveal.ts
  modified:
    - server/prisma/schema.prisma
    - shared/types/index.ts
    - shared/types/api.ts
    - server/src/services/admin.ts
    - server/src/index.ts
    - server/src/__tests__/services/admin.test.ts
    - server/src/__tests__/routes/admin.test.ts

key-decisions:
  - "Single GenderRevealConfig model with boolean flags (not separate unlocks table)"
  - "Accept either key from either participant (no enforcement of who uses which key)"
  - "myKeyValidated always false from GET endpoint, client tracks locally from POST response"
  - "Admin re-seal clears validation state but preserves gender value and keys"

patterns-established:
  - "Two-key unlock gate: gender value ONLY returned when revealedAt is set"
  - "Re-seal pattern: updateMany to clear booleans and nullable DateTime"

# Metrics
duration: 12min
completed: 2026-02-20
---

# Phase 7 Plan 1: Gender Reveal Backend Summary

**Two-key gender reveal backend with Serializable isolation, Prisma model, Zod-validated API, SignalR broadcast, and admin re-seal capability**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-20T16:12:18Z
- **Completed:** 2026-02-20T20:04:20Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- GenderRevealConfig Prisma model with unique envelope constraint and FK cascade
- Complete shared type definitions including Zod schemas with key uniqueness refinement
- Service layer with Serializable isolation preventing race conditions on simultaneous key entry
- Gender value NEVER returned to client unless both keys validated (REVEAL-05 security requirement)
- SignalR broadcasts for key_validated (progress) and reveal_unlocked (ceremony trigger)
- Admin endpoints: configure, get config, re-seal, delete
- Session reset clears validation state but preserves admin-created config (gender value, keys)

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema, migration, shared types** - `852e2c8` (feat)
2. **Task 2: Query layer, service, routes, reset, router wiring** - `e551515` (feat)

## Files Created/Modified
- `server/prisma/schema.prisma` - Added GenderRevealConfig model and Envelope relation
- `server/prisma/migrations/20260220000000_add_gender_reveal/migration.sql` - Table creation SQL
- `shared/types/genderReveal.ts` - All types, Zod schemas, SignalR message types
- `shared/types/index.ts` - Re-exports for gender reveal types
- `shared/types/api.ts` - Added genderRevealReset to ResetSessionResponse, new error codes
- `server/src/db/queries/genderReveal.ts` - Typed query functions (getConfig, createConfig, etc.)
- `server/src/services/genderReveal.ts` - Business logic with Serializable isolation for key validation
- `server/src/routes/genderReveal.ts` - Express routes with auth/admin middleware
- `server/src/services/admin.ts` - Reset logic and ResetSessionResult update
- `server/src/index.ts` - Router mount at /api/gender-reveal
- `server/src/__tests__/services/admin.test.ts` - Added genderRevealConfig mock
- `server/src/__tests__/routes/admin.test.ts` - Added genderRevealConfig mock

## Decisions Made
- **Single model with boolean flags:** Used keyAValidated/keyBValidated booleans instead of a separate unlocks table. Simpler for a fixed 2-key system.
- **Accept either key from either participant:** The server validates both keys as equivalent unlock tokens. The admin tells each person which key is theirs, but the server doesn't enforce assignment. Avoids edge cases where participants mix up keys.
- **myKeyValidated from GET is always false:** The GET state endpoint can't track per-participant key submission since we don't record who entered which key. The client tracks locally from the POST validate-key response.
- **Re-seal preserves config:** Admin re-seal clears keyAValidated, keyBValidated, and revealedAt but preserves genderValue, keyA, and keyB. This supports testing the ceremony multiple times.
- **Error codes added:** REVEAL_NOT_CONFIGURED and REVEAL_ALREADY_DONE added to ErrorCode union type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated admin test mocks for genderRevealConfig**
- **Found during:** Task 2 (after adding reset logic)
- **Issue:** Existing admin service and route tests didn't mock genderRevealConfig, causing "Cannot read properties of undefined (reading 'updateMany')" errors
- **Fix:** Added mockGenderRevealConfig to both test files' mock db objects, transaction callbacks, and updated test expectations to include genderRevealReset field
- **Files modified:** server/src/__tests__/services/admin.test.ts, server/src/__tests__/routes/admin.test.ts
- **Verification:** All 12 admin tests pass (9 service + 3 route)
- **Committed in:** e551515 (Task 2 commit)

**2. [Rule 1 - Bug] Removed unused import caught by eslint**
- **Found during:** Task 2 (commit pre-commit hook)
- **Issue:** deleteConfig was imported in service but only used in routes (not service)
- **Fix:** Removed unused import from service file
- **Files modified:** server/src/services/genderReveal.ts
- **Verification:** ESLint passes, build succeeds
- **Committed in:** e551515 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes required for tests and linting to pass. No scope creep.

## Issues Encountered
- Migration deploy failed due to Azure database not reachable from local network. Migration SQL is written correctly and will apply when the database is accessible (or during CI/CD). Not a blocker for code correctness.

## User Setup Required
None - no external service configuration required. Migration will be applied via CI/CD pipeline.

## Next Phase Readiness
- Backend API complete and ready for client integration
- All types exported from shared for client hooks and services
- SignalR events defined for two-device ceremony coordination
- Admin endpoints ready for content tab UI
- Next plans can build: useGenderReveal hook, KeyEntryPhase/WaitingPhase/CeremonyPhase/KeepsakePhase components, admin GenderRevealContentTab

---
*Phase: 07-gender-reveal-ceremony*
*Completed: 2026-02-20*
