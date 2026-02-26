# Wave 1 Implementation: PIN Security & Delete Confirmation

**Date:** 2026-02-25
**Issues Fixed:** B-001 (CRITICAL), B-027 (HIGH)

---

## B-001: Friend PIN Exposed in API Responses and Admin UI

### Problem
The `Friend` interface included `pin: string`, causing every API response that returned friend data to expose the PIN. This included the admin friend list (`GET /friends`), the friend letters admin view (`GET /friends/:id/letters`), and the admin UI which rendered the PIN in the friend list for all users to see.

PINs are authentication credentials and should never be transmitted except when absolutely necessary.

### Fix

**Shared types (`shared/types/friend.ts`):**
- Removed `pin` from the `Friend` interface
- Added `FriendWithPin` interface that extends `Friend` with `pin: string` -- used exclusively for the creation response
- Added `FriendCreateResponse` interface wrapping `FriendWithPin` for the `POST /friends` endpoint

**Server DB queries (`server/src/db/queries/friend.ts`):**
- `toApiFriend()` no longer includes `pin` in its output
- Added `toApiFriendWithPin()` that includes the PIN, used only by `createFriend()`
- `createFriend()` return type changed from `Friend` to `FriendWithPin`

**Server service (`server/src/services/friend.ts`):**
- `getAllFriends()` no longer maps `pin` into the response objects
- `createFriend()` return type changed from `Friend` to `FriendWithPin`

**Client API service (`client/src/services/friendApi.ts`):**
- `createFriend()` now returns `FriendWithPin` and uses `FriendCreateResponse` type
- Removed unused `Friend` and `FriendResponse` imports

**Client admin UI (`client/src/components/admin/FriendManager.tsx`):**
- Removed the `<span>` that displayed the PIN in the friend list card

**Client constants (`client/src/constants/strings.ts`):**
- Removed `FRIEND_MANAGER_PIN_PREFIX` since it is no longer used

**Shared type exports (`shared/types/index.ts`):**
- Added exports for `FriendWithPin` and `FriendCreateResponse`

### Impact
- The PIN is now only returned once: in the `POST /friends` creation response
- All subsequent API responses (`GET /friends`, `GET /friends/:id/letters`, etc.) no longer include PINs
- The admin friend list no longer displays PINs in the UI
- The admin can still see the PIN at creation time (returned in the API response) to share with the friend

### Files Changed
- `shared/types/friend.ts`
- `shared/types/index.ts`
- `server/src/db/queries/friend.ts`
- `server/src/services/friend.ts`
- `client/src/services/friendApi.ts`
- `client/src/components/admin/FriendManager.tsx`
- `client/src/constants/strings.ts`

---

## B-027: Delete Confirmation Missing Warning Text

### Problem
The delete confirmation UI in `FriendManager.tsx` showed "Confirm" and "Cancel" buttons when the user clicked the delete icon, but did not display any warning text explaining the consequences. The string `STRINGS.FRIEND_MANAGER_DELETE_CONFIRM` existed in constants but was never rendered.

### Fix
Added the warning text from `STRINGS.FRIEND_MANAGER_DELETE_CONFIRM` before the confirm/cancel buttons in the delete confirmation section. The text reads: "This will permanently delete this friend and all their letters. This cannot be undone."

### Files Changed
- `client/src/components/admin/FriendManager.tsx`

---

## Verification
- `shared/`: `npx tsc --noEmit` passes
- `server/`: `npx tsc --noEmit` passes
- `client/`: `npx tsc --noEmit` passes
- Grep for `friend.pin` in `*.ts*` files: only one remaining reference in `toApiFriendWithPin()` (correct)
- Grep for `FRIEND_MANAGER_PIN_PREFIX`: zero references (correctly removed)
