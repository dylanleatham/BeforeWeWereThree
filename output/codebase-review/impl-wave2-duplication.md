# Wave 2: Duplication & Consistency Fixes

**Date:** 2026-02-25
**Issues:** B-010, B-011, B-015, B-017, B-019, B-028

## Summary

Eliminated duplicated logic across envelope components, fixed a prop that was accepted but ignored, replaced a magic number with its existing constant, removed an unused required prop, and replaced an inline type with the shared type alias.

## Changes

### B-010 + B-011: Duplicated envelope utilities (HIGH)

**Problem:** `hasCompletedView` (same 5-type check) and `formatEnvelopeTypeLabel` (same split-map-join) were duplicated across `EnvelopePile.tsx`, `EnvelopeCard.tsx`, and `BaseEnvelope.tsx`.

**Fix:** Created `client/src/utils/envelope.ts` exporting both functions, then replaced all inline duplicates with imports.

| File | Change |
|------|--------|
| `client/src/utils/envelope.ts` | **New file** — `hasCompletedView()` and `formatEnvelopeTypeLabel()` |
| `client/src/components/envelope/EnvelopePile.tsx` | Replaced 5-line inline `hasCompletedView` with imported function call |
| `client/src/components/envelope/EnvelopeCard.tsx` | Replaced 5-line inline `hasCompletedView` and 3-line `typeLabel` with imported functions |
| `client/src/components/envelope/BaseEnvelope.tsx` | Replaced 3-line inline type formatting with `formatEnvelopeTypeLabel()` |

### B-015: KeyEntryPhase ignores keyLength prop (HIGH)

**Problem:** `KeyEntryPhase` accepted a `keyLength` prop but hardcoded `PIN_LENGTH` (8) internally for digit limit, auto-submit threshold, and progress dots.

**Fix:** Destructured `keyLength` from props and replaced all three `PIN_LENGTH` references. Removed unused `PIN_LENGTH` and `PIN_DISPLAY_MAX_LENGTH` imports. Computed display max length as `keyLength + 2` (accounts for date formatting slashes). Added `keyLength` to the `handleChange` dependency array.

| File | Change |
|------|--------|
| `client/src/components/activities/GenderReveal/KeyEntryPhase.tsx` | Use `keyLength` prop for digit limit, auto-submit check, progress dots, and display max length |

### B-017: Magic number 3000 ignoring existing constant (HIGH)

**Problem:** `PartnerPresence.tsx` used a hardcoded `3000` for toast auto-dismiss timeout, while `PARTNER_TOAST_DURATION_MS` (also 3000) already existed in animation constants.

**Fix:** Imported and used `PARTNER_TOAST_DURATION_MS`.

| File | Change |
|------|--------|
| `client/src/components/activities/WouldYouRather/PartnerPresence.tsx` | `3000` replaced with `PARTNER_TOAST_DURATION_MS` |

### B-019: Unused required prop myChoice (HIGH)

**Problem:** `WaitingPhase` declared `myChoice: WYRChoice` as a required prop but never used it. The caller had to pass `myVote!` with a non-null assertion.

**Fix:** Removed `myChoice` from `WaitingPhaseProps` and removed the prop passing in `WouldYouRatherActivity.tsx`. Also removed the now-unused `WYRChoice` import from `WaitingPhase.tsx`.

| File | Change |
|------|--------|
| `client/src/components/activities/WouldYouRather/WaitingPhase.tsx` | Removed `myChoice` from props interface and `WYRChoice` import |
| `client/src/components/activities/WouldYouRather/WouldYouRatherActivity.tsx` | Removed `myChoice={myVote!}` prop passing |

### B-028: submitWyrVote uses inline type (HIGH)

**Problem:** `submitWyrVote` in `api.ts` used inline `choice: 'option_a' | 'option_b'` instead of the shared `WYRChoice` type alias.

**Fix:** Added `WYRChoice` to the shared imports and used it as the parameter type.

| File | Change |
|------|--------|
| `client/src/services/api.ts` | Import `WYRChoice` from shared; use as `choice` parameter type |

## Files Modified (8)

1. `client/src/utils/envelope.ts` (new)
2. `client/src/components/envelope/EnvelopePile.tsx`
3. `client/src/components/envelope/EnvelopeCard.tsx`
4. `client/src/components/envelope/BaseEnvelope.tsx`
5. `client/src/components/activities/GenderReveal/KeyEntryPhase.tsx`
6. `client/src/components/activities/WouldYouRather/PartnerPresence.tsx`
7. `client/src/components/activities/WouldYouRather/WaitingPhase.tsx`
8. `client/src/components/activities/WouldYouRather/WouldYouRatherActivity.tsx`
9. `client/src/services/api.ts`

## Verification

All changes are behavior-preserving:
- `hasCompletedView` and `formatEnvelopeTypeLabel` produce identical results to the inlined versions
- `keyLength` is already passed as `8` by the caller, matching the previous `PIN_LENGTH` constant
- `PARTNER_TOAST_DURATION_MS` equals `3000`, matching the previous literal
- `myChoice` was never read in `WaitingPhase`, so removing it has no effect
- `WYRChoice` resolves to `'option_a' | 'option_b'`, identical to the inline type
