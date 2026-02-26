# Wave 3: Component & Hook Fixes

**Date:** 2026-02-25
**Issues Fixed:** B-041, B-042, B-043, B-045, B-036, B-037, B-056, B-062

---

## B-041: PinEntry uses raw HTML instead of design system components (MEDIUM)

**File:** `client/src/components/auth/PinEntry.tsx`

Replaced raw `<h1>` and `<p>` tags with `Heading` and `Text` design system components. Imported from `../common` barrel export.

- `<h1 className="pin-entry__title">` -> `<Heading level={1} className="pin-entry__title">`
- `<p className="pin-entry__subtitle">` -> `<Text variant="body" color="secondary" className="pin-entry__subtitle">`

Existing CSS classes still apply since both components accept `className` props.

---

## B-042: accessToken non-null assertion without guard (MEDIUM)

**File:** `client/src/context/SignalRContext.tsx`

Added an explicit guard before hub creation in the SignalR branch:

```typescript
if (!accessToken) {
  throw new Error('SignalR transport requires an accessToken');
}
```

This replaces the `accessToken!` non-null assertion, which would silently pass `undefined` to the access token factory. The error is caught by the existing `catch` block in the `connect()` function, which logs the error and sets connection state to `Disconnected`.

---

## B-043: Hardcoded animation duration in Button (MEDIUM)

**Files:** `client/src/constants/animation.ts`, `client/src/components/common/Button.tsx`

Added `BUTTON_PRESS_DURATION_S = 0.15` to the animation constants file under the "Scale Factors" section. Imported and used in Button.tsx replacing the inline `0.15` value.

---

## B-045: GUIDANCE_MAX_LENGTH local instead of in config.ts (MEDIUM)

**Files:** `client/src/constants/config.ts`, `client/src/components/activities/NameGame/NewRoundPhase.tsx`

Moved `GUIDANCE_MAX_LENGTH = 500` from a local constant in NewRoundPhase.tsx to `client/src/constants/config.ts` under a new "Name Game Configuration" section. Updated NewRoundPhase.tsx to import from the centralized config.

---

## B-036: Array index as React key for mutable option list (MEDIUM)

**File:** `client/src/components/admin/TriviaQuestionForm.tsx`

Added an `id: string` field to the `FormOption` interface. Introduced a module-level counter (`nextOptionId()`) to generate stable unique IDs for each option. Updated all option creation sites (initial state, add option) to include an `id`. Changed the JSX key from `index` to `option.id`.

Also fixed `handleOptionChange` to spread the existing option (`{ ...o, text }`) instead of creating a bare `{ text }` object, which would have dropped the `id` field.

---

## B-037: Error renders in muted grey instead of error color (MEDIUM)

**Files:** `client/src/components/admin/FriendManager.tsx`, `client/src/components/admin/FriendManager.css`

Replaced both `<Text variant="small" color="muted">` error displays with `<div className="friend-manager__error" role="alert">`, matching the project-wide error pattern used in EnvelopeForm, TriviaQuestionForm, and other admin components.

Added `.friend-manager__error` CSS class with `--color-dusk-rose` text color and `--color-dusk-rose-10` background, consistent with the established error styling.

---

## B-056: Missing mountedRef guards (MEDIUM)

**Files:** `client/src/hooks/useConfig.ts`, `client/src/hooks/useFriendDashboard.ts`, `client/src/hooks/useMediaLibrary.ts`

Added the `mountedRef` pattern per CLAUDE.md to all three hooks:

```typescript
const mountedRef = useRef(false);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);
```

All async `setState` calls after `await` are now guarded with `if (!mountedRef.current) return;`. The `finally` blocks also check `mountedRef.current` before calling `setIsLoading(false)`.

The `mountedRef.current = true` is set in the effect body (not just `useRef(true)`) to correctly handle React 18 StrictMode double-invocation, as documented in the project's lessons learned.

---

## B-062: Spacing token used as border-radius (LOW)

**File:** `client/src/components/auth/PinEntry.css`

Changed `border-radius: var(--space-6)` (24px spacing token) to `border-radius: var(--radius-lg)` (16px radius token). The `--radius-lg` token is the correct design system token for large border radii, matching the Card component and other elevated containers.
