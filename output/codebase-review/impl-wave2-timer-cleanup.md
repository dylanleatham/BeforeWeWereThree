# Implementation Wave 2: Timer Cleanup, Socket Leak, Type Casts, Dead Code

**Date:** 2026-02-25

## Issues Fixed

### B-009: Unguarded setTimeout with no cleanup (HIGH)

**Problem:** Two components had bare `setTimeout` calls that could fire after unmount, calling `setState` on an unmounted component.

**Fix 1 — `client/src/components/auth/PinEntry.tsx`:**
- Added `shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` to store the timer ID.
- Wrapped the existing `setTimeout` in `shakeTimerRef.current = setTimeout(...)`.
- Added a `useEffect` cleanup that calls `clearTimeout(shakeTimerRef.current)` on unmount.

**Fix 2 — `client/src/components/envelope/BaseEnvelope.tsx`:**
- Added `useRef` and `useEffect` to the existing import from React.
- Added `openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` to store the timer ID.
- Wrapped the existing `setTimeout` in `openTimerRef.current = setTimeout(...)`.
- Added a `useEffect` cleanup that calls `clearTimeout(openTimerRef.current)` on unmount.

---

### B-012: Socket leak on unmount race in SignalRContext (HIGH)

**Problem:** In the Socket.io connection path, `socketRef.current = socket` was assigned after an async `negotiateRealtime()` call, but the `mounted` flag was only checked before socket creation, not after event listener registration. If unmount occurred between the negotiate call resolving and the socket assignment, the socket would leak (never cleaned up).

**Fix — `client/src/context/SignalRContext.tsx`:**
- Added `if (!mounted) { socket.removeAllListeners(); socket.disconnect(); return; }` guard immediately before `socketRef.current = socket` (after event listeners are attached but before storing the reference). This ensures that if the component unmounted during the async gap, the socket is torn down immediately rather than leaking.

---

### B-016: Triple `as unknown as number[]` casts (HIGH)

**Problem:** `PULSE_OPACITY_RANGE` was declared as `[0.6, 1, 0.6] as const` (a readonly tuple), but `motion`'s `animate` prop expects `number[]`. Three components used `PULSE_OPACITY_RANGE as unknown as number[]` to work around this.

**Fix:**
- Changed the declaration in `client/src/constants/animation.ts` from `as const` to an explicit `number[]` type annotation: `export const PULSE_OPACITY_RANGE: number[] = [0.6, 1, 0.6];`
- Removed the `as unknown as number[]` cast from all three consumers:
  - `client/src/components/activities/NameGame/GeneratingPhase.tsx`
  - `client/src/components/activities/NameGame/WaitingPhase.tsx`
  - `client/src/components/activities/NameGame/WaitingForGuidancePhase.tsx`

---

### B-055: Dead loadedRef variables (MEDIUM)

**Problem:** Three hooks declared a `loadedRef` that was assigned `true` after successful data loading but never read anywhere. This was dead code left over from an earlier pattern.

**Fix:** Removed the `loadedRef` declaration and all `loadedRef.current = true` assignments from:
- `client/src/hooks/useNameGame.ts` (declaration + 2 assignments)
- `client/src/hooks/useLetter.ts` (declaration + 1 assignment)
- `client/src/hooks/useWouldYouRather.ts` (declaration + 1 assignment)

All three hooks still use `useRef` for other purposes (`mountedRef`, `votingInFlightRef`), so the import remains valid.

## Files Modified

| File | Change |
|------|--------|
| `client/src/components/auth/PinEntry.tsx` | Timer ref + cleanup effect |
| `client/src/components/envelope/BaseEnvelope.tsx` | Timer ref + cleanup effect, added useRef/useEffect imports |
| `client/src/context/SignalRContext.tsx` | Mounted guard before socket assignment |
| `client/src/constants/animation.ts` | PULSE_OPACITY_RANGE type changed from readonly tuple to number[] |
| `client/src/components/activities/NameGame/GeneratingPhase.tsx` | Removed cast |
| `client/src/components/activities/NameGame/WaitingPhase.tsx` | Removed cast |
| `client/src/components/activities/NameGame/WaitingForGuidancePhase.tsx` | Removed cast |
| `client/src/hooks/useNameGame.ts` | Removed dead loadedRef |
| `client/src/hooks/useLetter.ts` | Removed dead loadedRef |
| `client/src/hooks/useWouldYouRather.ts` | Removed dead loadedRef |

## Verification

- Grep confirmed zero remaining `loadedRef` references in `client/src/hooks/`
- Grep confirmed zero remaining `as unknown as number[]` casts in `client/src/`
