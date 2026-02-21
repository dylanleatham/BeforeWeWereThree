# Code Review — Before We Were Three

**Date:** 2026-02-20
**Codebase:** ~302 source files (client: 175, server: 63, shared: 26)
**Previous review:** 2026-02-17 (items from that review marked with [PREV] if still open)

---

## Overall Assessment

Strong engineering discipline: strict TypeScript throughout, consistent architectural patterns (typed queries, Zod validation, uniform API responses), proper separation of concerns, good accessibility. Issues are primarily edge cases in security-critical paths and async state management.

---

## Critical Issues

### 1. Timing Attack on Gender Reveal Key Validation

- **File:** `server/src/services/genderReveal.ts:112-122`
- **Confidence:** HIGH

Direct string comparison (`key === config.keyA`) is vulnerable to timing attacks. The gender value is the most sensitive data in this app.

**Fix:** Use `crypto.timingSafeEqual()`:

```typescript
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

---

### 2. Socket.io Connection Accepts Unvalidated User IDs

- **File:** `server/src/services/realtime.ts:51-59`
- **Confidence:** HIGH

`userId` comes from `socket.handshake.auth.userId` with no session validation. Any client can impersonate any user.

**Fix:** Validate session cookie/token during Socket.io handshake and derive `userId` from verified session.

---

### 3. Race Condition in Participant Role Conversion

- **File:** `server/src/services/participant.ts:104-135`
- **Confidence:** HIGH

Guest count query doesn't account for the record being converted, allowing duplicate designations from simultaneous conversions.

**Fix:** Exclude current record from count query: `where: { role: 'guest', id: { not: existing.id } }`.

---

### 4. Memory Leak: SignalR Event Handler Cleanup

- **File:** `client/src/hooks/useSignalREvent.ts:44-45`
- **Confidence:** HIGH

`wrappedHandler` is created fresh each effect run, so `connection.off()` receives a different reference than what was registered. Handlers accumulate forever.

**Fix:** Store wrapped handler in a ref:

```typescript
const wrappedHandlerRef = useRef<((...args: unknown[]) => void) | null>(null);

useEffect(() => {
  if (!connection) return;
  const wrappedHandler = (...args: unknown[]) => {
    handlerRef.current(args[0] as T);
  };
  wrappedHandlerRef.current = wrappedHandler;
  connection.on(eventName, wrappedHandler);
  return () => {
    if (wrappedHandlerRef.current) {
      connection.off(eventName, wrappedHandlerRef.current);
    }
  };
}, [connection, eventName]);
```

---

## High Priority Issues

### 5. Vote Guard Permanently Blocks After Error

- **File:** `client/src/hooks/useNameGame.ts:351-390`
- **Confidence:** HIGH

`votingInFlightRef` prevents double-voting but if a network error occurs, the guard stays set permanently. User must refresh.

**Fix:** Clear guard in both success and error paths, not just `finally`.

---

### 6. Friend PIN Uniqueness Has TOCTOU Race

- **File:** `server/src/services/friend.ts:72-86`
- **Confidence:** HIGH

PIN uniqueness checked in separate queries before insert. Another transaction can insert same PIN between check and create.

**Fix:** Rely on database unique constraint, catch `P2002` error.

---

### 7. `useAutoSave` Flush Has Unstable Dependencies

- **File:** `client/src/hooks/useAutoSave.ts:121-139`
- **Confidence:** HIGH

`flush` includes `executeSave` in dependency array, causing recreation on every state change. Breaks memoization, risks infinite loops.

**Fix:** Use ref pattern to remove `executeSave` from dependency array.

---

### 8. Missing Error Boundaries Around Activities

- **File:** `client/src/components/envelope/BaseEnvelope.tsx:94-169`
- **Confidence:** HIGH

Activities render without error boundary. Any throw crashes entire app.

**Fix:** Wrap activity render in `<ErrorBoundary>`:

```tsx
<div className="base-envelope__body">
  <ErrorBoundary fallback={<ErrorFallback onRetry={handleClose} />}>
    {renderActivityContent()}
  </ErrorBoundary>
</div>
```

---

### 9. No Rate Limiting on Expensive Admin Endpoints

- **Files:** `server/src/routes/admin.ts`, `genderReveal.ts`, `nameGame.ts`
- **Confidence:** MEDIUM

Reset session, AI name generation, and bulk operations have no rate limiting.

**Fix:** Apply rate limiting middleware to admin endpoints that trigger expensive operations.

---

### 10. SignalR Group Join Doesn't Verify Envelope Access

- **File:** `server/src/routes/signalr.ts:108-109`
- **Confidence:** MEDIUM

Regex accepts any group name matching `activity:[a-z0-9-]+` without checking participant access to that envelope.

**Fix:** After extracting envelope ID from group name, verify it exists and participant has access.

---

### 11. `getAllPhotos` Has No Pagination

- **File:** `server/src/routes/media.ts:118-126`
- **Confidence:** MEDIUM

`GET /media` returns all photos unbounded.

**Fix:** Add `limit`/`offset` query params with reasonable defaults (e.g., 50, max 100).

---

### 12. Missing Abort Controller in Media Upload

- **File:** `client/src/hooks/useMediaUpload.ts:71-122`
- **Confidence:** MEDIUM

XHR upload is aborted on unmount, but preceding SAS token fetch is not. Can cause state updates on unmounted components.

**Fix:** Add `AbortController` for the SAS request, abort in cleanup.

---

## Medium Priority Issues

### 13. Blob Deletion Inconsistency

- **File:** `server/src/services/media.ts:248-257`

If blob deletion fails, DB record is still deleted, creating orphaned blobs.

**Fix:** Throw on blob failure or implement cleanup job.

---

### 14. Anthropic Error Message Leaks Implementation Details

- **File:** `server/src/services/anthropic.ts:146-152`

Error message includes console URL. Should be generic in production.

**Fix:** Conditional message based on `NODE_ENV`.

---

### 15. Missing `aria-atomic` on Auto-Save Status

- **File:** `client/src/components/activities/Letter/WritingPhase.tsx:116`

Screen readers may miss rapid save status changes.

**Fix:** Add `aria-atomic="true"` to the status `<div>`.

---

### 16. `useEnvelopes` updateStatus Recreated on Every State Change

- **File:** `client/src/hooks/useEnvelopes.ts:47-76`

`envelopes` in dependency array causes unnecessary re-renders.

**Fix:** Use ref pattern for envelopes lookup inside callback.

---

## Shared Types / API Contract Issues

### 17. Inline Response Types Not Enforced

Many API calls use inline types (`apiFetch<{ questions: TriviaQuestion[] }>`) instead of shared named types. Server could change wrapper shape without TypeScript catching it.

**Fix:** Create explicit response types in `shared/types/` for all endpoints, use on both sides.

---

### 18. Inconsistent DELETE Response Pattern

Some DELETE endpoints return `Record<string, never>`, others `{ deleted: boolean }`. Pick one.

**Fix:** Standardize on `{ deleted: true }` with a shared `DeleteResponse` type.

---

### 19. Missing Name Vote Response Type

- **File:** `client/src/services/api.ts:607`

`{ allVoted: boolean; results?: NameGameResults }` is inline, not a shared type.

**Fix:** Add `SubmitNameVoteResponse` to `shared/types/nameGame.ts`.

---

## Previously Identified (2026-02-17) — Status Check Needed

These were found in the prior review. Verify if already fixed:

### [PREV-1] Weak JWT secret fallback outside production
- **File:** `server/src/services/session.ts:13-16`
- JWT_SECRET only enforced when `NODE_ENV === 'production'`. Should enforce for any non-development env.

### [PREV-2] Rate limiter bypass via fingerprint rotation
- **File:** `server/src/middleware/rateLimit.ts:203-208`
- Rate limit key includes `req.body?.deviceFingerprint` which is attacker-controlled.

### [PREV-3] Auto-save can overwrite already-submitted letters
- **File:** `server/src/services/letter.ts:75-93`
- `saveLetter` doesn't check `submittedAt !== null`.

### [PREV-4] Friend PIN lookup is not timing-safe
- **File:** `server/src/routes/auth.ts:58-70`
- Admin/guest PINs use `timingSafeEqual`, but friend PIN is a DB query with timing leak.

### [PREV-5] CSP `scriptSrc` includes `'unsafe-inline'`
- **File:** `server/src/index.ts:41`

### [PREV-6] Missing `onDelete` cascade on Participant FK relationships
- **File:** `server/prisma/schema.prisma`

### [PREV-7] `Participant.createdAt` typed as `Date` instead of `string`
- **File:** `shared/types/auth.ts:98`

### [PREV-8] Duplicated `apiFetch` wrapper
- **Files:** `client/src/services/api.ts` / `client/src/services/friendApi.ts`

### [PREV-9] `PhotoAttachment` duplicates `MediaAttachment`
- **Files:** `client/src/components/activities/Letter/PhotoAttachment.tsx` / `client/src/components/common/MediaAttachment.tsx`

### [PREV-10] `usePhotoUpload` duplicates `useMediaUpload`
- **Files:** `client/src/hooks/usePhotoUpload.ts` / `client/src/hooks/useMediaUpload.ts`

### [PREV-11] Build artifacts committed in `server/deploy/`

### [PREV-12] Windows `nul` artifact in repo root

### [PREV-13] Missing route tests (2 of 11 covered)

### [PREV-14] Missing hook tests (7 of 15 covered)

### [PREV-15] Missing service tests for nameGame and friend

---

## Recommended Fix Order

1. Fix SignalR event handler cleanup (#4) — memory leak
2. Fix timing attack on gender reveal keys (#1) — security
3. Add Socket.io session validation (#2) — security
4. Fix vote guard race condition (#5) — UX blocker
5. Fix `useAutoSave` flush dependencies (#7) — stability
6. Add error boundaries around activities (#8) — resilience
7. Fix participant designation race condition (#3) — data integrity
8. Fix friend PIN TOCTOU race (#6) — data integrity
9. Add formal shared response types (#17) — maintainability
10. Add pagination to photo endpoint (#11) — scalability
