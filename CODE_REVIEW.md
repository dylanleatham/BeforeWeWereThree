# Code Review -- Before We Were Three

**Date:** 2026-02-21
**Previous reviews:** 2026-02-17, 2026-02-20
**Scope:** Full codebase (client, server, shared, CSS)

Items marked [PREV] were found in prior reviews and are still open. New items from this review are unmarked.

---

## CRITICAL -- Bugs & Security

### 1. [PREV] Timing attack on gender reveal key validation
- **File:** `server/src/services/genderReveal.ts:112-122`
- **Status:** [x] Fixed (already resolved — `safeCompare` with `timingSafeEqual` in use)

Direct string comparison (`key === config.keyA`) is vulnerable to timing attacks. The gender value is the most sensitive data in this app.

**Fix:** Use `crypto.timingSafeEqual()`.

---

### 2. [PREV] Socket.io connection accepts unvalidated user IDs
- **File:** `server/src/services/realtime.ts:51-59`
- **Status:** [x] Fixed (already resolved — session cookie validated in Socket.io middleware)

`userId` comes from `socket.handshake.auth.userId` with no session validation. Any client can impersonate any user.

**Fix:** Validate session cookie/token during Socket.io handshake and derive `userId` from verified session.

---

### 3. [PREV] Race condition in participant role conversion
- **File:** `server/src/services/participant.ts:104-135`
- **Status:** [x] Fixed (already resolved — excludes current record and uses Serializable isolation)

Guest count query doesn't account for the record being converted, allowing duplicate designations from simultaneous conversions.

**Fix:** Exclude current record from count query: `where: { role: 'guest', id: { not: existing.id } }`.

---

### 4. [PREV] Memory leak: SignalR event handler cleanup
- **File:** `client/src/hooks/useSignalREvent.ts:44-45`
- **Status:** [x] Fixed (already resolved — `wrappedHandlerRef` stores stable reference for on/off)

`wrappedHandler` is created fresh each effect run, so `connection.off()` receives a different reference than what was registered. Handlers accumulate forever.

**Fix:** Store wrapped handler in a ref so the same reference is used for both `on()` and `off()`.

---

### 5. Race condition in `setGenderByFriend` -- no transaction isolation
- **File:** `server/src/services/genderReveal.ts:300-316`
- **Status:** [x] Fixed — wrapped in `$transaction` with Serializable isolation

Classic TOCTOU: reads `config.genderValue`, checks if null, then writes -- all outside a transaction. Two concurrent requests could both set the gender. Other read-then-write patterns in the codebase correctly use Serializable transactions (e.g., `validateKey`), but this one was missed.

**Fix:** Wrap in a `$transaction` with `{ isolationLevel: 'Serializable' }`.

---

### 6. Missing try/catch in SignalR group join/leave routes
- **File:** `server/src/routes/signalr.ts:103-157`
- **Status:** [x] Fixed — added try/catch with 500 error response to both handlers

Both `groups/join` and `groups/leave` async handlers have no try/catch. If `getEnvelopeById` or `addUserToGroup` throws, the request hangs forever. Every other route in the codebase follows the try/catch pattern.

**Fix:** Add try/catch with `500` error response, matching other routes.

---

### 7. Socket.io `joinGroup` accepts arbitrary group names
- **File:** `server/src/services/realtime.ts:93-99`
- **Status:** [x] Fixed — added `/^activity:[a-z0-9-]+$/i` regex validation to Socket.io joinGroup/leaveGroup handlers

The HTTP `groups/join` endpoint validates group names against `/^activity:[a-z0-9-]+$/i`, but the Socket.io event handler does `socket.join(groupName)` with no validation. An authenticated user could join arbitrary rooms.

**Fix:** Add the same regex validation to the Socket.io handler.

---

### 8. Missing Zod validation on `PUT /friends/gender-keeper`
- **File:** `server/src/routes/friend.ts:102-121`
- **Status:** [x] Fixed — added `setGenderKeeperSchema` (`z.object({ friendId: z.string().uuid().nullable() })`) in shared types

Uses `req.body as { friendId: string | null }` with no Zod schema. Violates the project's "Request validation uses Zod" non-negotiable.

**Fix:** Add a Zod schema: `z.object({ friendId: z.string().uuid().nullable() })`.

---

### 9. Hardcoded personal names in `FriendLetterView.tsx`
- **File:** `client/src/components/friend/FriendLetterView.tsx:50-54`
- **Status:** [x] Fixed — replaced with `STRINGS.RECIPIENT_NAMES`

```tsx
const recipientLabel = {
  you: 'Dylan',
  partner: 'Wife',
  baby: 'Baby',
}
```

Duplicates the `STRINGS.RECIPIENT_NAMES` constant that already exists in `client/src/constants/strings.ts:261`. Should use the centralized constant instead.

**Fix:** Replace with `STRINGS.RECIPIENT_NAMES[letterView.recipient] ?? letterView.recipient`.

---

### 10. Fingerprint fallback creates new identity on every page refresh
- **File:** `client/src/services/fingerprint.ts:38-43`
- **Status:** [x] Fixed — fallback ID now persisted in `localStorage`

When FingerprintJS fails (increasingly common with browser privacy settings), the fallback generates a random ID using `Date.now()` + `Math.random()` that's only cached in memory. Every refresh = new identity = lost progress, orphaned participants.

**Fix:** Persist fallback ID in `localStorage`.

---

## HIGH -- Silent Failures & Error Handling

### 11. Admin CRUD operations swallow all errors (3 functions)
- **File:** `client/src/components/admin/EnvelopeManager.tsx:50-88`
- **Status:** [x] Fixed — added catch blocks with `alert()` to `handleCreate`, `handleUpdate`, `handleDelete`

`handleCreate`, `handleUpdate`, `handleDelete` all use try/finally with **no catch**. API failures produce zero user feedback -- the spinner stops and nothing happens.

**Fix:** Add catch blocks that surface the error to the admin.

---

### 12. Gender reveal admin: `loadEnvelopes` and `loadConfig` silently catch errors
- **File:** `client/src/components/admin/GenderRevealContentTab.tsx:57-91`
- **Status:** [x] Fixed — added `loadError` state, catch blocks set error message, UI displays error instead of empty state

`loadEnvelopes` catch is literally `// Silent error`. Failed load shows "No envelopes exist" which is misleading. `loadConfig` sets config to null on error, showing "Not configured" when it IS configured but couldn't load -- potential data overwrite risk.

**Fix:** Set error state and display an error message instead of masquerading as empty/unconfigured.

---

### 13. Gender reveal admin: `handleReseal` and `handleDelete` swallow errors
- **File:** `client/src/components/admin/GenderRevealContentTab.tsx:174-205`
- **Status:** [x] Fixed — added catch blocks with `setFormError(...)`, dismiss confirmation dialog on error, display error in main view

Both use try/finally with no catch. API failures stop the spinner but show no error to the admin.

**Fix:** Add catch blocks with `setFormError(...)`.

---

### 14. Azure SignalR adapter: broadcast failures are logged but never thrown
- **File:** `server/src/services/realtime.ts:200-284`
- **Status:** [x] Fixed — all four adapter methods now throw after logging on non-OK responses

All four SignalR adapter methods check `response.ok` and log errors but don't throw. Callers think the broadcast succeeded. In production, if SignalR credentials expire, ALL real-time features silently break -- both devices get stuck in "waiting" states permanently.

**Fix:** Throw on non-OK responses so callers can handle or propagate the failure.

---

### 15. SignalR initialization failure leaves adapter null -- all real-time silently disabled
- **File:** `server/src/services/realtime.ts:304-310`
- **Status:** [x] Fixed — added `WarningAdapter` fallback that logs warnings on every broadcast attempt

If the Azure SignalR constructor throws, the adapter stays null and all broadcasting is skipped via `if (realtime) { ... }` guards. The server starts normally but no real-time features work. No health check surfaces this.

**Fix:** Either throw and prevent server startup, or set a fallback adapter that logs warnings on every broadcast attempt.

---

### 16. `useGenderReveal`: Load failure masquerades as "not configured"
- **File:** `client/src/hooks/useGenderReveal.ts:120-125`
- **Status:** [x] Fixed — added `'error'` phase to `GenderRevealPhase`, shows error message with retry button

Network failure sets phase to `'not-configured'`. Users think the admin forgot to set it up. No retry mechanism from this phase.

**Fix:** Set a separate error phase or display a retry-able error message.

---

### 17. `useGenderReveal`: All key validation errors show "Invalid key"
- **File:** `client/src/hooks/useGenderReveal.ts:198-202`
- **Status:** [x] Fixed — distinguishes `TypeError`/network errors (shows connection error message) from validation failures

Network timeouts, server 500s, and auth errors all display "Invalid key." During the gender reveal ceremony, a user with the correct key gets told it's wrong.

**Fix:** Check error type and show appropriate message (network error vs. invalid key).

---

### 18. `useSession`: Logout is fire-and-forget
- **File:** `client/src/hooks/useSession.ts:150-164`
- **Status:** [x] Fixed — `logout` now awaits `apiLogout()`, falls back to client-side cookie clearing on failure

`apiLogout()` is not awaited. If the API call fails, the server session persists. User refreshes and is auto-authenticated again despite explicitly logging out.

**Fix:** Await the API call. Fall back to client-side cookie clearing if it fails.

---

### 19. `uncaughtException` handler continues running in production
- **File:** `server/src/index.ts:150-157`
- **Status:** [x] Fixed — now calls `gracefulShutdown('uncaughtException')` in all environments

Only exits in development. In production, the process continues in potentially corrupt state after an uncaught exception. Node.js docs explicitly recommend against this.

**Fix:** Perform graceful shutdown in production (stop accepting connections, drain, then exit).

---

### 20. `useSession`: `checkSession` catch treats errors as "not authenticated"
- **File:** `client/src/hooks/useSession.ts:90-100`
- **Status:** [x] Fixed — catch block now sets `error: STRINGS.SESSION_ERROR_NETWORK` so user sees connectivity message

If `getSession()` throws (network error), the catch block sets `isAuthenticated: false` with `error: null`. The user sees the PIN entry screen with no error message, when the real problem is connectivity.

**Fix:** Show a network error message on session check failure.

---

### 21. `useLetter`: `submit` does not re-throw on failure
- **File:** `client/src/hooks/useLetter.ts:218-221`
- **Status:** [x] Fixed — added `throw err` after `setError`, matching `save()` behavior

When `submitLetter` fails, the error is caught and `setError` is called, but NOT re-thrown. The calling component has no way to detect failure from the return value. Contrast with `save()` which does re-throw.

**Fix:** Re-throw the error after setting state, or return a success boolean.

---

### 22. `joinRealtimeGroup` and `leaveRealtimeGroup` ignore API response
- **File:** `client/src/services/api.ts:231-246`
- **Status:** [x] Fixed — both functions now check `response.success` and throw on failure

Both functions call `apiFetch` but discard the response. If the API returns `{ success: false }`, it's silently ignored. Unlike other API functions that check `response.success` and throw.

**Fix:** Check `response.success` and throw on failure, matching other API functions.

---

### 23. `useNameGame`: Error on load sets phase to `new-round` instead of error state
- **File:** `client/src/hooks/useNameGame.ts:226-230`
- **Status:** [x] Fixed — added `'error'` to `NameGamePhase`, load failure now sets `phase: 'error'`

When loading fails, the error message is set but phase is also set to `'new-round'`. The user sees "Start Round" UI with broken/missing data.

**Fix:** Set phase to an error state, only allow retry.

---

### 24. [PREV] Vote guard permanently blocks after error
- **File:** `client/src/hooks/useNameGame.ts:351-390`
- **Status:** [x] Fixed (already resolved — `finally` block clears `votingInFlightRef` on all paths)

`votingInFlightRef` prevents double-voting but if a network error occurs, the guard stays set permanently. User must refresh.

**Fix:** Clear guard in both success and error paths.

---

### 25. [PREV] Friend PIN uniqueness has TOCTOU race
- **File:** `server/src/services/friend.ts:72-86`
- **Status:** [x] Fixed (already resolved — relies on DB unique constraint, catches `P2002` error)

PIN uniqueness checked in separate queries before insert. Another transaction can insert same PIN between check and create.

**Fix:** Rely on database unique constraint, catch `P2002` error.

---

### 26. [PREV] `useAutoSave` flush has unstable dependencies
- **File:** `client/src/hooks/useAutoSave.ts:121-139`
- **Status:** [x] Fixed — `executeSaveRef` stores stable reference, removed from `flush` dependency array

`flush` includes `executeSave` in dependency array, causing recreation on every state change. Breaks memoization, risks infinite loops.

**Fix:** Use ref pattern to remove `executeSave` from dependency array.

---

### 27. [PREV] Missing error boundaries around activities
- **File:** `client/src/components/envelope/BaseEnvelope.tsx:94-169`
- **Status:** [x] Fixed (already resolved — `<ErrorBoundary>` wraps `renderActivityContent()` with fallback UI)

Activities render without error boundary. Any throw crashes entire app.

**Fix:** Wrap activity render in `<ErrorBoundary>`.

---

## MEDIUM -- Missing Patterns, Logic Issues & Consistency

### 28. Missing `mountedRef` in 3 major hooks
- **Status:** [x] Fixed — added `mountedRef` with effect setup/cleanup and async guards to all three hooks

Per CLAUDE.md, this is a required pattern. These hooks set state after async operations with no unmount guard:
- `client/src/hooks/useLetter.ts` -- `loadLetterState`, `save`, `submit`
- `client/src/hooks/useWouldYouRather.ts` -- `loadState`, `vote`
- `client/src/hooks/useNameGame.ts` -- `loadState`, `vote`

Other hooks (`useGenderReveal`, `useTrivia`, `useMediaUpload`, `useFriendLetter`) all correctly implement it.

**Fix:** Add the `mountedRef` pattern with proper `useEffect` setup/cleanup per CLAUDE.md.

---

### 29. `useNameGame` calls `useSession()` independently -- duplicate API call
- **File:** `client/src/hooks/useNameGame.ts:149`
- **Status:** [x] Fixed — `useNameGame` accepts `participantId` as parameter, `NameGameActivity` provides it

`useSession()` creates its own state and fires `GET /api/auth/session` on mount. The app already calls `useSession()` at the top level. This creates a redundant API call just to get `participantId`.

**Fix:** Accept `participantId` as a parameter instead of calling `useSession()`.

---

### 30. `MANAGER_RESET_SUCCESS` only reports 4 of 12 reset categories
- **File:** `client/src/constants/strings.ts:69`
- **Status:** [x] Fixed — imports `ResetSessionResponse`, computes summary total across all 12 categories

The function parameter type has 4 fields but `ResetSessionResponse` has 12. The reset success message omits photos, name votes, trivia answers, and gender reveal.

**Fix:** Import `ResetSessionResponse` from shared types. Update the message to include all categories (or a summary total).

---

### 31. Completed envelope reopening logic is dead code
- **Files:** `client/src/components/envelope/EnvelopePile.tsx:31-38`, `client/src/components/envelope/EnvelopeCard.tsx:29`
- **Status:** [x] Fixed — `EnvelopeCard` and `EnvelopePile` now allow reopening completed envelopes for all types with completed-state views

`BaseEnvelope.shouldRenderActivity()` allows trivia, friend-letter, and gender-reveal to render when completed. But `EnvelopeCard` makes ALL completed cards non-clickable (`isClickable = !isCompleted`), and `EnvelopePile` only allows reopening for `would-you-rather`. Completed trivia review, friend-letter view, and gender-reveal keepsake views are unreachable.

**Fix:** Update `EnvelopeCard` and `EnvelopePile` to allow reopening for all types with completed-state views.

---

### 32. N+1 query in WYR `getEnvelopeState`
- **File:** `server/src/services/wyr.ts:31-84`
- **Status:** [x] Fixed — added `getVotesForPromptIds` batch query, `getEnvelopeState` now fetches all votes in one query

For each prompt, issues 2 separate DB queries (`getVoteForParticipant` + `getVotesForPrompt`). With N prompts = 2N+1 queries.

**Fix:** Batch-fetch all votes in one query, index by promptId in memory.

---

### 33. WYR vote completion check runs outside the transaction
- **File:** `server/src/services/wyr.ts:169-183`
- **Status:** [x] Fixed — completion check and envelope status update now run inside the Serializable transaction

After the Serializable vote transaction completes, the code checks if ALL prompts are complete by calling `countVotesForPrompt` in a loop OUTSIDE the transaction. A concurrent vote could cause a stale read.

**Fix:** Move the completion check inside the Serializable transaction.

---

### 34. `findGenderRevealConfig` uses `findFirst()` with no ordering
- **File:** `server/src/db/queries/genderReveal.ts:75-77`
- **Status:** [x] Fixed — added `orderBy: { createdAt: 'desc' }` to `findFirst()`

If multiple configs somehow exist, the function returns a non-deterministic row. The route validates the friend is the keeper on one config, but `setGenderByFriend` could operate on a different one.

**Fix:** Accept `envelopeId` as a parameter, or add `orderBy: { createdAt: 'desc' }`.

---

### 35. Gender reveal keys stored in plaintext
- **File:** `server/src/db/queries/genderReveal.ts:26-38`
- **Status:** [x] Fixed — keys hashed with scrypt via `server/src/utils/keyHash.ts`, raw keys removed from admin response, admin UI shows set/entered status

Keys (`keyA`, `keyB`) are plaintext in the DB. Timing-safe comparison is already used in the service layer, indicating security-conscious design. Hashing would complete defense-in-depth. However, the admin API returns them for display, so this is a design tradeoff.

**Fix:** Consider hashing with bcrypt/argon2. Admin UI would no longer show raw keys.

---

### 36. SignalR group join/leave failures silently swallowed on client
- **File:** `client/src/context/SignalRContext.tsx:84-88`
- **Status:** [x] Fixed — added `withRetry` (3 attempts, exponential backoff) and `groupError` state in context for UI consumption

For the Azure SignalR adapter, `joinGroup` and `leaveGroup` call REST API endpoints and catch errors with `.catch(console.error)`. If joining fails, the user never receives real-time updates for that activity. No UI indicator is shown.

**Fix:** Surface connection issues to the user or implement retry logic.

---

### 37. [PREV] No rate limiting on expensive admin endpoints
- **Files:** `server/src/routes/admin.ts`, `genderReveal.ts`, `nameGame.ts`
- **Status:** [x] Fixed — added `validateKeyRateLimiter` (10/15min), `setGenderRateLimiter` (5/min), `adminMutationRateLimiter` (5/min) to genderReveal.ts; admin reset and AI guidance already had limiters

Reset session, AI name generation, and bulk operations have no rate limiting.

**Fix:** Apply rate limiting middleware to admin endpoints that trigger expensive operations.

---

### 38. [PREV] `getAllPhotos` has no pagination
- **File:** `server/src/routes/media.ts:118-126`
- **Status:** [x] Fixed — `getAllPhotos` now returns `{ photos, total }` with parallel count query; route returns `total` for client pagination

`GET /media` returns all photos unbounded.

**Fix:** Add `limit`/`offset` query params with reasonable defaults.

---

### 39. [PREV] Missing abort controller in media upload
- **File:** `client/src/hooks/useMediaUpload.ts:71-122`
- **Status:** [x] Fixed — `registerPhoto` in api.ts now accepts `signal` parameter; `useMediaUpload` passes `controller.signal` to it

XHR upload is aborted on unmount, but preceding SAS token fetch is not.

**Fix:** Add `AbortController` for the SAS request, abort in cleanup.

---

### 40. [PREV] Blob deletion inconsistency
- **File:** `server/src/services/media.ts:248-257`
- **Status:** [x] Fixed — DB deletion wrapped in try/catch after blob success; logs orphaned DB record warning with photoId/blobUrl on failure

If blob deletion fails, DB record is still deleted, creating orphaned blobs.

**Fix:** Throw on blob failure or implement cleanup job.

---

### 41. [PREV] Anthropic error message leaks implementation details
- **File:** `server/src/services/anthropic.ts:146-152`
- **Status:** [x] Fixed — API call wrapped in try/catch; production throws generic "AI name generation failed" message; SDK errors logged but not exposed

Error message includes console URL. Should be generic in production.

**Fix:** Conditional message based on `NODE_ENV`.

---

### 42. [PREV] `useEnvelopes` updateStatus recreated on every state change
- **File:** `client/src/hooks/useEnvelopes.ts:47-76`
- **Status:** [x] Fixed — replaced `useEffect`-based ref sync with `setEnvelopesWithRef` that updates state and ref synchronously; eliminates stale reads in rapid `updateStatus` calls

`envelopes` in dependency array causes unnecessary re-renders.

**Fix:** Use ref pattern for envelopes lookup inside callback.

---

## LOW -- Design System & Style Consistency

### 43. Hardcoded font families across ~10 CSS files
- **Status:** [x] Fixed — replaced with `var(--font-display)` and `var(--font-body)` across all 7 affected files

Newer components use `'Fraunces', serif` and `'Source Sans 3', sans-serif` instead of `var(--font-display)` and `var(--font-body)`.

**Affected files:**
- `client/src/components/friend/FriendLetterActivity.css`
- `client/src/components/friend/FriendDashboard.css`
- `client/src/components/friend/FriendLetterView.css`
- `client/src/components/friend/ThankYouNoteView.css`
- `client/src/components/admin/FriendManager.css`
- `client/src/components/admin/ThankYouNoteEditor.css`
- `client/src/components/common/MediaAttachment.css`

**Fix:** Replace with `var(--font-display)` and `var(--font-body)`.

---

### 44. Hardcoded `rgba()` values across ~8 CSS files
- **Status:** [x] Fixed — added opacity variants to variables.css (`--color-deep-terracotta-5/8/20`, `--color-dusk-rose-8`, `--color-soft-sage-12`), replaced all raw rgba() values

Raw RGB values like `rgba(188, 108, 74, 0.2)` instead of design system variables.

**Affected files:**
- `client/src/components/friend/FriendLetterActivity.css`
- `client/src/components/admin/FriendManager.css`
- `client/src/components/admin/ThankYouNoteEditor.css`
- `client/src/components/friend/ThankYouNoteView.css`
- `client/src/components/friend/GenderInput.css`
- `client/src/components/friend/FriendLetterCard.css`

**Fix:** Replace with `rgba(var(--color-deep-terracotta-rgb), 0.2)` or add dedicated opacity variables.

---

### 45. `GenderInput.css` references nonexistent CSS variables
- **File:** `client/src/components/friend/GenderInput.css`
- **Status:** [x] Fixed — replaced with actual design system variables (`--space-2/3/4/6`, `--color-warm-charcoal-12`, `--bg-elevated`, `--reveal-boy-primary`, `--color-dusk-rose`)

Uses `--space-lg`, `--space-md`, `--space-sm`, `--color-border`, `--color-surface`, `--color-accent-blue`, `--color-error` -- none of which exist in the design system. Works only because of inline fallback values, meaning the design system has zero control over this component.

**Fix:** Replace with actual variable names: `--space-6`, `--space-4`, `--space-3`, `--color-warm-charcoal-12`, `--bg-elevated`, `--color-dusk-rose`, etc.

---

### 46. Hardcoded strings in ~6 component files
- **Status:** [x] Fixed — added ~20 string constants to `strings.ts`, replaced hardcoded strings in GenderRevealContentTab, FriendManager, KeyEntryPhase, SpotifyButton, GenderInput, BaseEnvelope

Scattered hardcoded UI strings violating non-negotiable #9:
- `client/src/components/admin/GenderRevealContentTab.tsx` (~15 strings)
- `client/src/components/admin/FriendManager.tsx` (~5 strings)
- `client/src/components/activities/GenderReveal/KeyEntryPhase.tsx` ("Checking...")
- `client/src/components/common/SpotifyButton.tsx` ("Open Spotify playlist")
- `client/src/components/friend/GenderInput.tsx` ("Boy", "Girl")
- `client/src/components/envelope/BaseEnvelope.tsx` ("Partner")

**Fix:** Move all to `STRINGS` in `client/src/constants/strings.ts`.

---

### 47. Inconsistent `letter-spacing` values across CSS
- **File:** `client/src/components/envelope/EnvelopeCard.css:141` and others
- **Status:** [x] Fixed — added `--tracking-wider` (0.05em) and `--tracking-widest` (0.1em) to typography.css, replaced all 15 hardcoded values across CSS files

`EnvelopeCard.css` uses `letter-spacing: 0.04em` while `BaseEnvelope.css` uses `var(--tracking-wide)` (0.02em) for the same visual element (type label pill). Various files use 0.03em, 0.04em, 0.05em, 0.1em without variables.

**Fix:** Use `var(--tracking-wide)` consistently, or define `--tracking-wider` if different values are needed.

---

## PREV -- Still Open from Prior Reviews

### 48. [PREV] Weak JWT secret fallback outside production
- **File:** `server/src/services/session.ts:13-16`
- **Status:** [x] Fixed (already resolved — code uses `!== 'development'` which enforces for all non-dev environments)

JWT_SECRET only enforced when `NODE_ENV === 'production'`. Should enforce for any non-development env.

---

### 49. [PREV] Rate limiter bypass via fingerprint rotation
- **File:** `server/src/middleware/rateLimit.ts:203-208`
- **Status:** [x] Fixed (already resolved — `getRateLimitKey` uses IP only, fingerprint removed from key)

Rate limit key includes `req.body?.deviceFingerprint` which is attacker-controlled.

---

### 50. [PREV] Auto-save can overwrite already-submitted letters
- **File:** `server/src/services/letter.ts:75-93`
- **Status:** [x] Fixed (already resolved — `saveLetter` checks `existing?.submittedAt` and throws `ALREADY_SUBMITTED`)

`saveLetter` doesn't check `submittedAt !== null`.

---

### 51. [PREV] Friend PIN lookup is not timing-safe
- **File:** `server/src/routes/auth.ts:58-70`
- **Status:** [x] Fixed (already resolved — all three lookups run unconditionally via `Promise.all`, normalizing response timing regardless of PIN type)

Admin/guest PINs use `timingSafeEqual`, but friend PIN is a DB query with timing leak.

---

### 52. [PREV] CSP `scriptSrc` includes `'unsafe-inline'`
- **File:** `server/src/index.ts:41`
- **Status:** [x] Fixed (already resolved — `'unsafe-inline'` only included when `NODE_ENV === 'development'`, production uses `["'self'"]` only)

---

### 53. [PREV] Missing `onDelete` cascade on Participant FK relationships
- **File:** `server/prisma/schema.prisma`
- **Status:** [x] Fixed (already resolved — all child FK relationships to Participant use `onDelete: Cascade`)

---

### 54. [PREV] `Participant.createdAt` typed as `Date` instead of `string`
- **File:** `shared/types/auth.ts:98`
- **Status:** [x] Fixed (already resolved — `createdAt` typed as `string` matching JSON serialization)

---

### 55. [PREV] Duplicated `apiFetch` wrapper
- **Files:** `client/src/services/api.ts`, `client/src/services/friendApi.ts`
- **Status:** [x] Fixed (already resolved — `apiFetch` extracted to shared `client/src/services/fetchClient.ts`, both files import from it)

---

### 56. [PREV] `PhotoAttachment` duplicates `MediaAttachment`
- **Files:** `client/src/components/activities/Letter/PhotoAttachment.tsx`, `client/src/components/common/MediaAttachment.tsx`
- **Status:** [x] Fixed (already resolved — `PhotoAttachment.tsx` removed, `WritingPhase` uses `MediaAttachment` directly)

---

### 57. [PREV] `usePhotoUpload` duplicates `useMediaUpload`
- **Files:** `client/src/hooks/usePhotoUpload.ts`, `client/src/hooks/useMediaUpload.ts`
- **Status:** [x] Fixed (already resolved — `usePhotoUpload.ts` removed, all consumers use `useMediaUpload`)

---

### 58. [PREV] Inline response types not enforced
- **Status:** [x] Fixed — added `MessageResponse` and `SetResponse` to `shared/types/api.ts`, replaced all 4 remaining inline types in `api.ts` and `friendApi.ts`

Many API calls use inline types instead of shared named types. Server could change wrapper shape without TypeScript catching it.

**Fix:** Create explicit response types in `shared/types/` for all endpoints.

---

### 59. [PREV] Inconsistent DELETE response pattern
- **Status:** [x] Fixed (already resolved — all DELETE endpoints use `successResponse({ deleted: true })` with shared `DeleteResponse` type)

Some DELETE endpoints return `Record<string, never>`, others `{ deleted: boolean }`.

**Fix:** Standardize on `{ deleted: true }` with a shared `DeleteResponse` type.

---

### 60. [PREV] Missing `aria-atomic` on auto-save status
- **File:** `client/src/components/activities/Letter/WritingPhase.tsx:116`
- **Status:** [x] Fixed (already resolved — `aria-atomic="true"` present on the auto-save status `div`)

---

### 61. [PREV] SignalR group join doesn't verify envelope access
- **File:** `server/src/routes/signalr.ts:108-109`
- **Status:** [x] Fixed — HTTP route already validates envelope existence; Socket.io `joinGroup` handler now also verifies envelope exists via `getEnvelopeById` before `socket.join()`

Regex accepts any group name matching `activity:[a-z0-9-]+` without checking participant access to that envelope.

---

### 62. [PREV] Build artifacts committed in `server/deploy/`
- **Status:** [x] Fixed (already resolved — `deploy/` in `.gitignore`, files not tracked by git)

---

### 63. [PREV] Windows `nul` artifact in repo root
- **Status:** [x] Fixed (already resolved — `nul` in `.gitignore`, file not tracked by git)

---

### 64. [PREV] Missing route tests (2 of 11 covered)
- **Status:** [x] Fixed — added `genderReveal.test.ts` (43 tests) and `trivia.test.ts` (45 tests); now 12 of 13 routes covered

---

### 65. [PREV] Missing hook tests (7 of 15 covered)
- **Status:** [x] Fixed — added `useGenderReveal.test.ts` (15 tests) and `useTrivia.test.ts` (12 tests); now 14 of 16 hooks covered

---

### 66. [PREV] Missing service tests for nameGame and friend
- **Status:** [x] Fixed — nameGame and friend already had tests; added `genderReveal.test.ts` (34 tests) and `trivia.test.ts` (18 tests); now 10 of 12 services covered

---

## Summary

| Category | Critical | High | Medium | Low | Prev Open |
|----------|----------|------|--------|-----|-----------|
| Security | 4 | - | - | - | 5 |
| Race conditions | 2 | 1 | 2 | - | - |
| Silent failures | 1 | 10 | 1 | - | - |
| React patterns | 1 | 2 | 2 | - | - |
| Design system | 1 | - | - | 5 | - |
| API/types | - | - | 1 | - | 3 |
| Performance | - | - | 1 | - | 1 |
| Testing | - | - | - | - | 3 |
| Cleanup | - | - | - | - | 3 |

**Recommended fix order:**
1. Security criticals (1-4) -- timing attacks, impersonation, race conditions
2. New bug criticals (5-10) -- transaction races, hung routes, identity loss
3. High-priority silent failures (11-27) -- admin UX, production real-time, error handling
4. Medium patterns (28-42) -- mountedRef, dead code, query performance
5. Low design system (43-47) -- CSS variables, font consistency
6. Prev cleanup (48-66) -- tech debt from prior reviews
