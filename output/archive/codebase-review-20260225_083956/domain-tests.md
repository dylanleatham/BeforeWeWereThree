## Domain Review: Test Suite

### Files Reviewed

**Client (22 files)**
- `client/src/__tests__/setup.ts`
- `client/src/__tests__/App.test.tsx`
- `client/src/__tests__/components/PinEntry.test.tsx`
- `client/src/__tests__/hooks/useAutoSave.test.ts`
- `client/src/__tests__/hooks/useConfig.test.ts`
- `client/src/__tests__/hooks/useEnvelopes.test.ts`
- `client/src/__tests__/hooks/useFriendDashboard.test.ts`
- `client/src/__tests__/hooks/useFriendLetter.test.ts`
- `client/src/__tests__/hooks/useGenderReveal.test.ts`
- `client/src/__tests__/hooks/useHaptics.test.ts`
- `client/src/__tests__/hooks/useLetter.test.ts`
- `client/src/__tests__/hooks/useMediaLibrary.test.ts`
- `client/src/__tests__/hooks/useMediaUpload.test.ts`
- `client/src/__tests__/hooks/useNameGame.test.ts`
- `client/src/__tests__/hooks/usePhotoUpload.test.ts`
- `client/src/__tests__/hooks/useSession.test.ts`
- `client/src/__tests__/hooks/useSignalREvent.test.ts`
- `client/src/__tests__/hooks/useSwipeNavigation.test.ts`
- `client/src/__tests__/hooks/useTrivia.test.ts`
- `client/src/__tests__/hooks/useWouldYouRather.test.ts`
- `client/src/__tests__/services/api.test.ts`
- `client/src/__tests__/services/fingerprint.test.ts`

**Server (27 files)**
- `server/src/__tests__/setup.ts`
- `server/src/__tests__/db/queries/config.test.ts`
- `server/src/__tests__/middleware/auth.test.ts`
- `server/src/__tests__/middleware/rateLimit.test.ts`
- `server/src/__tests__/routes/admin.test.ts`
- `server/src/__tests__/routes/auth.test.ts`
- `server/src/__tests__/routes/config.test.ts`
- `server/src/__tests__/routes/envelopes.test.ts`
- `server/src/__tests__/routes/friend.test.ts`
- `server/src/__tests__/routes/genderReveal.test.ts`
- `server/src/__tests__/routes/health.test.ts`
- `server/src/__tests__/routes/letter.test.ts`
- `server/src/__tests__/routes/media.test.ts`
- `server/src/__tests__/routes/nameGame.test.ts`
- `server/src/__tests__/routes/signalr.test.ts`
- `server/src/__tests__/routes/trivia.test.ts`
- `server/src/__tests__/routes/wyr.test.ts`
- `server/src/__tests__/services/admin.test.ts`
- `server/src/__tests__/services/friend.test.ts`
- `server/src/__tests__/services/genderReveal.test.ts`
- `server/src/__tests__/services/letter.test.ts`
- `server/src/__tests__/services/media.test.ts`
- `server/src/__tests__/services/nameGame.test.ts`
- `server/src/__tests__/services/participant.test.ts`
- `server/src/__tests__/services/realtime.test.ts`
- `server/src/__tests__/services/session.test.ts`
- `server/src/__tests__/services/trivia.test.ts`
- `server/src/__tests__/services/wyr.test.ts`

### Issues Found

#### CRITICAL — Must Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-test-001 | `client/src/__tests__/hooks/useAutoSave.test.ts:15` | `afterEach` is called but not imported from `vitest`. Import only includes `describe, it, expect, vi, beforeEach`. `afterEach` resolves to `undefined` at runtime, so `vi.useRealTimers()` is never called. Fake timers leak and corrupt state for subsequent test files. | Add `afterEach` to the import: `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';` |

#### HIGH — Should Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-test-002 | `client/src/__tests__/hooks/usePhotoUpload.test.ts` | Orphaned duplicate test file. Tests the same hook (`useMediaUpload`) as `useMediaUpload.test.ts` with overlapping scenarios but different mock techniques (`vi.hoisted` vs not). Misleading filename — comment acknowledges it was "Previously usePhotoUpload." | Delete `usePhotoUpload.test.ts`. Merge any unique scenarios into `useMediaUpload.test.ts`. |
| CR-test-003 | `server/src/__tests__/routes/auth.test.ts:390-430` | Contains a `describe('Health Check', ...)` block duplicating the entirety of `health.test.ts`. | Remove the Health Check block from `auth.test.ts`. |
| CR-test-004 | All 13 server route test files | ~40-60 lines of identical boilerplate duplicated per file (~600 lines total): `type AnyMock`, mock setup for `db/connection.js`, `db/queries/config.js`, `middleware/rateLimit.js`, plus `getAdminCookies()`/`getGuestCookies()` helpers. A change to cookie structure requires touching 13 files. | Extract to `server/src/__tests__/helpers/routeTestSetup.ts`. |
| CR-test-005 | `server/src/__tests__/services/nameGame.test.ts:190-198` | Test "should return `already_submitted` if guidance already exists" asserts `result.status === 'waiting_for_partner'`. Either the test description or the assertion is wrong. | Verify actual service behavior and fix either the test name or the assertion. |

#### MEDIUM — Worth Fixing
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-test-006 | `client/src/__tests__/hooks/useNameGame.test.ts:89-95` | `const _RESULTS` declared but never used. Dead code. | Delete the declaration. |
| CR-test-007 | `client/src/__tests__/hooks/useSwipeNavigation.test.ts` | Module-level `let dragHandler` variable could leak across tests in non-isolating Vitest mode. | Move inside `beforeEach` or reset explicitly. |
| CR-test-008 | Multiple client hook tests (`useLetter`, `useGenderReveal`, `useWouldYouRather`, `useNameGame`) | SignalR event handlers are registered but never fired in tests. The callbacks are never invoked, so the SignalR-driven state update path is untested. | Capture registered handlers via `mockUseSignalREvent.mock.calls` and fire them with mock payloads, asserting state transitions. |
| CR-test-009 | `server/src/__tests__/services/realtime.test.ts:56-58` | `jest.resetModules()` in `beforeEach` wipes module-level `jest.unstable_mockModule()` calls. Tests pass fragile timing but may fail under different Jest worker configs. | Move mock registration inside each test or `beforeEach` after `resetModules()`. |
| CR-test-010 | `server/src/__tests__/routes/nameGame.test.ts` | `POST /api/name-game/:envelopeId/guidance` only tests the 503 path (API key missing). No happy-path, already-submitted, or waiting-for-partner tests. | Add tests for successful submission, 409, and 200 waiting responses. |

#### LOW — Nice to Have
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-test-011 | All 11 server service test files | `type AnyMock = jest.Mock<any>` redeclared in every file. | Centralize in `server/src/__tests__/setup.ts`. |
| CR-test-012 | `client/src/__tests__/hooks/useFriendLetter.test.ts` | Auto-save cancellation test advances only 500ms (less than debounce delay). Test passes regardless of whether cancellation works. | Advance past debounce threshold, then verify. |
| CR-test-013 | `client/src/__tests__/hooks/useMediaUpload.test.ts:13-15` | `uploadToBlob` mock returns `undefined` by default. Hook expects `{ xhr, promise }`. Tests may pass accidentally via early error paths. | Set default mock return value in `beforeEach`. |
| CR-test-014 | `server/src/__tests__/middleware/rateLimit.test.ts` | `jest.resetModules()` + `await import(...)` pattern is fragile — module import inside async `beforeEach` could race with tests. | Verify async handling is correct. |

### Positive Observations
- Comprehensive service-layer coverage with precise mock sequencing.
- Realtime adapter coverage tests both transports and error fallback.
- Client hook state machines tested for every phase transition including error and retry.
- Fake timer discipline is solid (debounce tests use `vi.advanceTimersByTimeAsync`).
- SignalR group lifecycle (join/leave) is verified on mount/unmount.
- Trivia service tests are dense and precise with boundary conditions.
- All test fixtures use typed constants from shared types package.

### Domain Health Score
7.5/10 — Substantively stronger than average. Service-layer tests are detailed and typed. Client hooks cover all phase machines. Score held back by the critical missing import (C1), duplicate test file (H1), 600+ lines of boilerplate duplication (H3), and untested SignalR handler paths (M3).
