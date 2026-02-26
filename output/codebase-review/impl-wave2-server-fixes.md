# Wave 2: Server Fixes

**Date:** 2026-02-25
**Issues Fixed:** B-020, B-021, B-022, B-024, B-025, B-046, B-047, B-049, B-050

## Summary

Nine server-side issues resolved covering deduplicated auth logic, corrected error codes, robust Prisma error detection, logic consistency fixes, transactional safety, and API response consistency.

## Changes

### B-020: Triplicated auth middleware logic (HIGH)
**File:** `server/src/middleware/auth.ts`

Extracted a private `resolveSession(req, res)` helper that encapsulates the shared logic: read session cookie, verify JWT via `verifySession()`, look up participant in database, and handle all error responses (401 for missing/invalid cookie, 401 for expired session). Each middleware (`authMiddleware`, `friendMiddleware`, `adminMiddleware`) now calls `resolveSession()` and only adds its own role check. `optionalAuthMiddleware` remains unchanged since it intentionally skips error responses.

### B-021: Wrong error codes in trivia routes (HIGH)
**File:** `server/src/routes/trivia.ts`

- Lines 114, 140: `PROMPT_NOT_FOUND` changed to `QUESTION_NOT_FOUND` for trivia question admin endpoints
- Line 253: `PROMPT_NOT_FOUND` changed to `QUESTION_NOT_FOUND` for GET envelope state
- Line 304: `PROMPT_NOT_FOUND` changed to `QUESTION_NOT_FOUND` for answer submission error mapping
- Line 308: `ALREADY_VOTED` changed to `ALREADY_ANSWERED` for answer submission error mapping

**File:** `shared/types/api.ts` -- Added `QUESTION_NOT_FOUND` and `ALREADY_ANSWERED` to the `ErrorCode` union type.

### B-022: Fragile error detection via string matching (HIGH)
**Files:** `server/src/routes/letter.ts`, `server/src/routes/wyr.ts`

Replaced `error.message.includes('Unique constraint')` with Prisma error code checking: `(error as { code: string }).code === 'P2002'`. This matches the pattern already used correctly in `nameGame.ts:160-165`.

### B-024: isLastPrompt logic inconsistent with envelopeComplete (HIGH)
**File:** `server/src/services/wyr.ts`

The previous `isLastPrompt` check compared sort-order position (`allPrompts[last].id === promptId`), which was fragile -- prompts could be voted on out of order, and sorting no longer implied completion order. Replaced with `isLastPrompt = envelopeComplete`. If the envelope is complete, we just finished the last prompt by definition. Also removed the now-unnecessary `orderBy: { sortOrder: 'asc' }` from the query since sort order is no longer relevant to this check.

### B-025: Non-transactional cleanup after generation failure (HIGH)
**File:** `server/src/services/nameGame.ts`

Wrapped the two cleanup operations (`nameGameRound.delete` and `nameGameGuidance.deleteMany`) in `db.$transaction([...])` so they execute atomically. Previously, if the round delete succeeded but the guidance delete failed, orphaned guidance records would block retries.

### B-046: Wrong error code for missing friend letter (MEDIUM)
**File:** `server/src/routes/friend.ts`

Changed `FRIEND_NOT_FOUND` to `FRIEND_LETTER_NOT_FOUND` on the GET `/friends/letter/:friendLetterId` endpoint. The entity being looked up is a friend letter, not a friend.

**File:** `shared/types/api.ts` -- Added `FRIEND_LETTER_NOT_FOUND` to the `ErrorCode` union type.

### B-047: Health route doesn't use successResponse (MEDIUM)
**File:** `server/src/routes/health.ts`

Replaced inline `{ success: true, data: healthData }` with `successResponse(healthData)` from the shared package, matching the pattern used by all other routes.

### B-049: DELETE friend returns 500 instead of 404 (MEDIUM)
**File:** `server/src/routes/friend.ts`

When `removeFriend()` returns `false` (friend not found), the response now returns 404 with `FRIEND_NOT_FOUND` instead of 500 with `INTERNAL_ERROR`.

### B-050: Stale hardcoded fallback model ID (MEDIUM)
**File:** `server/src/services/anthropic.ts`

Updated fallback model from `'claude-sonnet-4-5-20250929'` to `'claude-sonnet-4-6'`.

## Verification

- `npx tsc --noEmit` passes for both `server/` and `client/` with zero errors.
