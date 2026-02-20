# Code Review: Before We Were Three

**Date:** 2026-02-17
**Scope:** Full codebase (166 source files) — server, client, shared types, tests, configuration
**Reviewed by:** 4 specialized agents (full codebase, server, client, types/tests/config)

---

## Critical (fix immediately)

### 1. Weak JWT secret fallback outside `production`

**File:** `server/src/services/session.ts:13-16`

JWT_SECRET is only enforced when `NODE_ENV === 'production'`. If `NODE_ENV` is `undefined`, `staging`, or anything else, the server runs with `'development-secret-change-in-production'`. An attacker who knows this string can forge any session token.

```typescript
// Current:
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-in-production';
```

**Fix:**
```typescript
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'development') {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-change-in-production';
```

---

## Important (fix soon)

### 2. Rate limiter bypass via fingerprint rotation

**File:** `server/src/middleware/rateLimit.ts:203-208`

The rate limit key includes `req.body?.deviceFingerprint`, which is attacker-controlled. Sending a different fingerprint per request creates fresh buckets, completely bypassing the 5-attempt PIN limit.

```typescript
// Current (bypassable):
function getRateLimitKey(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const fingerprint = req.body?.deviceFingerprint ?? 'unknown';
  return `ratelimit:pin:${ip}:${fingerprint}`;
}
```

**Fix:** Remove fingerprint from the key; rate limit on IP alone:
```typescript
function getRateLimitKey(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `ratelimit:pin:${ip}`;
}
```

---

### 3. Auto-save can overwrite already-submitted letters

**File:** `server/src/services/letter.ts:75-93`

`saveLetter` doesn't check `submittedAt !== null`. A stale auto-save timer firing after submission silently overwrites the final content. The friend letter flow correctly guards against this (`server/src/services/friend.ts:192`), but the couple's letter flow doesn't.

**Fix:** Add guard before the upsert:
```typescript
const existing = await getLetterForParticipant(prompt.id, participantId);
if (existing?.submittedAt) {
  throw new Error('ALREADY_SUBMITTED');
}
```

---

### 4. Friend PIN lookup is not timing-safe

**File:** `server/src/routes/auth.ts:58-70`

Admin/guest PINs use `timingSafeEqual`, but friend PIN lookup is a DB query that returns faster for non-existent records. Combined with the rate limiter bypass (#2), this creates a timing side-channel.

```typescript
// Current: DB query only runs if admin/guest PIN didn't match
if (adminPin && safeCompare(pin, adminPin)) { ... }
else if (guestPin && safeCompare(pin, guestPin)) { ... }
else {
  const friend = await db.friend.findUnique({ where: { pin } }); // timing leak
}
```

**Fix:** Run all lookups unconditionally, then evaluate:
```typescript
const [guestPin, adminPin] = await Promise.all([getGuestPin(), getAdminPin()]);
const friend = await db.friend.findUnique({ where: { pin }, select: { id: true } });

const isAdmin = adminPin && safeCompare(pin, adminPin);
const isGuest = guestPin && safeCompare(pin, guestPin);

if (isAdmin) { role = 'admin'; }
else if (isGuest) { role = 'guest'; }
else if (friend) { role = 'friend'; friendId = friend.id; }
else { /* invalid */ }
```

---

### 5. CSP `scriptSrc` includes `'unsafe-inline'`

**File:** `server/src/index.ts:41`

This weakens XSS protection. A Vite-built React SPA shouldn't need inline scripts in production.

**Fix:** Make conditional:
```typescript
scriptSrc: process.env.NODE_ENV === 'development'
  ? ["'self'", "'unsafe-inline'"]
  : ["'self'"],
```

---

### 6. Missing `onDelete` cascade on 5 Participant FK relationships

**File:** `server/prisma/schema.prisma:91,125,143,194,211`

`WyrVote`, `Letter`, `Photo`, `NameGameGuidance`, and `NameGameVote` all have FK refs to `Participant` without `onDelete: Cascade`. Currently relying on manual deletion order in `resetSession()`, which is fragile.

**Fix:** Add `onDelete: Cascade` to all five relations:
```prisma
participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
```

---

### 7. `Participant.createdAt` typed as `Date` instead of `string`

**File:** `shared/types/auth.ts:98`

Every other shared type uses `string` for dates (correct for JSON transport). `Participant` uses `Date`, which is wrong — JSON serialization produces a string, not a `Date` object.

**Fix:** Change to `createdAt: string`.

---

## Code Duplication (CLAUDE.md #11 violations)

### 8. Duplicated `apiFetch` wrapper

**Files:**
- `client/src/services/api.ts:42-96`
- `client/src/services/friendApi.ts:18-61`

Nearly identical fetch wrappers copy-pasted. A bug fix would need to be applied in two places.

**Fix:** Extract shared `apiFetch` into `client/src/services/fetchClient.ts` and import in both.

---

### 9. `PhotoAttachment` duplicates `MediaAttachment`

**Files:**
- `client/src/components/activities/Letter/PhotoAttachment.tsx` (141 lines)
- `client/src/components/common/MediaAttachment.tsx` (157 lines)

~85% identical. Only difference is file type acceptance (image-only vs all media).

**Fix:**
1. Delete `PhotoAttachment.tsx`
2. Update `WritingPhase.tsx` to import `MediaAttachment` from `../../common/MediaAttachment`
3. Add `accept` prop to `MediaAttachment` if image-only restriction needed

---

### 10. `usePhotoUpload` duplicates `useMediaUpload`

**Files:**
- `client/src/hooks/usePhotoUpload.ts` (156 lines)
- `client/src/hooks/useMediaUpload.ts` (113 lines)

~90% identical. Same state management, XHR abort, progress tracking. Only differs in accepted MIME types and whether it calls `registerPhoto()`.

**Fix:** Create unified hook with options:
```typescript
interface UseMediaUploadOptions {
  accept?: 'image' | 'video' | 'audio' | 'all';
  registerInDatabase?: boolean;
}

export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const { accept = 'all', registerInDatabase = false } = options;
  // ... shared implementation
}
```

---

## Repo Hygiene

### 11. Build artifacts committed

**Directory:** `server/deploy/`

100+ `.js`, `.js.map`, `.d.ts` files committed despite `deploy/` in `.gitignore`. Causes repo bloat and merge conflicts. Was likely committed before the gitignore rule was added.

**Fix:**
```bash
git rm -r --cached server/deploy/
git commit -m "fix: remove build artifacts from repository"
```

---

### 12. Windows artifact file

**File:** `nul` in repo root

Leftover from a failed Windows command redirect. Already in `.gitignore` but still tracked.

**Fix:**
```bash
git rm nul
git commit -m "fix: remove Windows nul artifact"
```

---

## Test Coverage Gaps

### 13. Missing route tests

Only **2 of 11** route files have tests (`auth.ts`, `admin.ts`). Missing tests for: `envelopes`, `wyr`, `letter`, `media`, `nameGame`, `friend`, `health`, `config`, `signalr`.

---

### 14. Missing hook tests

Only **7 of 15** hooks have tests. Untested: `useLetter`, `useWouldYouRather`, `useNameGame`, `useFriendLetter`, `useFriendDashboard`, `useSignalREvent`, `useSwipeNavigation`, `useMediaUpload`.

---

### 15. Missing service tests

`nameGame` and `friend` services have no tests despite being among the most complex features.

---

## Minor / Nice-to-Have

### 16. CSP allows wildcard `*.blob.core.windows.net`

**File:** `server/src/index.ts:44-46`

Should be restricted to `https://bwwtstorage.blob.core.windows.net`.

---

### 17. `ErrorCode | string` in `ApiError` defeats type safety

**File:** `shared/types/api.ts:39`

```typescript
// Current (defeats purpose of typed union):
code: ErrorCode | string;

// Fix:
code: ErrorCode;
```

---

### 18. Missing DB indexes on `Participant.friendId` and `Envelope.friendLetterId`

**File:** `server/prisma/schema.prisma`

Other FKs are indexed; these two are not. Add `@@index([friendId])` and `@@index([friendLetterId])`.

---

### 19. `ResetSessionResult` / `ResetSessionResponse` type drift

**Files:** `server/src/services/admin.ts` / `shared/types/api.ts`

`ResetSessionResponse` includes `message: string` but `ResetSessionResult` doesn't. The route handler works around it with an intersection type, but they should be synchronized per CLAUDE.md.

---

### 20. Auto-save delay inconsistency

**Files:** `client/src/hooks/useFriendLetter.ts:16` (2000ms) / `client/src/components/activities/Letter/WritingPhase.tsx:55` (1500ms)

Should be a shared constant in `client/src/constants/config.ts`.

---

### 21. Magic number `20` (fast swipe min distance)

**File:** `client/src/components/activities/NameGame/VotingPhase.tsx:73,86`

Used twice without a named constant. Should be `FAST_SWIPE_MIN_DISTANCE_PX` in config.

---

### 22. No blob existence verification on `POST /media/register`

**File:** `server/src/routes/media.ts:68-99`

Accepts any `blobUrl` without verifying the blob exists in Azure Storage. A user could register arbitrary URLs or URLs pointing to other users' blobs.

**Fix:** Verify blob existence using Azure SDK before registering. Also validate the URL hostname matches the storage account.

---

### 23. No max file size enforcement for direct blob uploads

**File:** `server/src/services/media.ts`

SAS tokens don't enforce file size. Uploads bypass Express (which has 1MB limit). Users could upload GB-sized files.

**Fix:** Check blob size after registration via Azure API; delete if over limit (e.g., 10MB).

---

## Priority Summary

| Priority | Issues | Description |
|----------|--------|-------------|
| Fix immediately | #1 | JWT secret fallback allows token forgery |
| Fix soon | #2-4 | Rate limiter bypass, auto-save overwrite, timing side-channel |
| Fix soon | #5-7 | CSP hardening, FK cascades, type fix |
| Refactor | #8-10 | Consolidate duplicated code |
| Repo cleanup | #11-12 | Remove committed artifacts |
| Test coverage | #13-15 | Add missing tests |
| Nice-to-have | #16-23 | Hardening, type safety, constants |
