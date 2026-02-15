# Code Review: Remaining Issues (P3 + P4)

Completed: P0, P1, P2 fixes (15 files, 199 insertions, 59 deletions). Not yet committed.

---

## P3 — Standards Compliance (Small effort)

### #12. Hardcoded user-facing strings (CLAUDE.md Non-Negotiable #9)
Multiple media/photo components have inline strings instead of using `constants/strings.ts`:
- `client/src/components/activities/MediaLibrary/MediaLibraryActivity.tsx`: "Our Photos", "Shuffle", "Uploading... {progress}%", "Add Photo"
- `client/src/components/activities/MediaLibrary/PhotoGrid.tsx`: "No photos yet", aria-labels like "View photo {n}", "Delete photo {n}"
- `client/src/components/activities/Letter/PhotoAttachment.tsx`: "Attached photo", "Remove photo", "Add Photo", "Uploading... {progress}%", "Select photo to upload"

**Fix:** Add constants to `client/src/constants/strings.ts` and replace inline strings.

### #13. TypeScript `any` usage (CLAUDE.md Non-Negotiable #1)
- `server/src/services/admin.ts:41`: `(tx: any)` in `$transaction` callback
- Has eslint-disable comment but CLAUDE.md says "no `any`"

**Fix:** Remove `any` and let TypeScript infer the type, or use `Prisma.TransactionClient`.

### #14. `AppConfig` type not in shared types (CLAUDE.md Non-Negotiable #3)
- `client/src/services/api.ts:528` defines `AppConfig` locally
- Server has separate definition in `server/src/routes/config.ts`

**Fix:** Move to `shared/types/config.ts`, export from `shared/types/index.ts`, import in both.

### #15. Missing error codes in shared type union
Error codes used in server routes but not in `shared/types/api.ts:ErrorCode`:
- `ALREADY_SUBMITTED` (server/src/routes/letter.ts)
- `PHOTO_NOT_FOUND` (server/src/routes/media.ts)
- `PHOTO_EXISTS` (server/src/routes/media.ts)
- `SERVICE_UNAVAILABLE` (server/src/routes/media.ts)

**Fix:** Add to `ErrorCode` union in `shared/types/api.ts`.

---

## P4 — Test Coverage (Large effort)

Overall coverage: ~23% (12 test files out of ~50 source files).

### Top 5 critical untested areas:

1. **Real-time service** (`server/src/services/realtime.ts`) — Zero coverage on core feature. Socket.io adapter, SignalR adapter, group management, user-to-socket tracking.

2. **Admin reset route** (`server/src/routes/admin.ts`) — No integration test for the most destructive operation. Service is tested but not the route/middleware layer.

3. **WYR + Letter services** (`server/src/services/wyr.ts`, `server/src/services/letter.ts`) — Race conditions, SignalR broadcasting, envelope status transitions, state machine logic all untested.

4. **Media service** (`server/src/services/media.ts`) — SAS token generation, blob deletion, filename sanitization, env var validation all untested.

5. **Client hooks** (10 hooks untested) — `useEnvelopes`, `useWouldYouRather`, `useLetter`, `usePhotoUpload`, `useMediaLibrary`, `useAutoSave`, `useConfig`, `useSignalREvent`, `useSwipeNavigation`, `useHaptics`.

### Also missing:
- All activity component tests (WYR, Letter, MediaLibrary)
- Route integration tests for envelopes, wyr, letter, media, config, signalr
- DB query tests for envelopes, wyr, letter, media
- E2E tests (no Playwright/Cypress setup)
