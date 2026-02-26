# Wave 1 Implementation: CSS & HTML Fixes

**Date:** 2026-02-25
**Issues Fixed:** B-002, B-003, B-013

---

## B-002: Nested button inside button in PhotoGrid (CRITICAL)

**File:** `client/src/components/activities/MediaLibrary/PhotoGrid.tsx`

**Problem:** An outer `<button>` element wrapped an inner delete `<button>`, which is invalid HTML per the spec. Browsers may handle nested interactive elements unpredictably, and screen readers will misinterpret the structure.

**Fix:** Replaced the outer `<button>` with a `<div>` that has:
- `role="button"` for accessibility semantics
- `tabIndex={0}` for keyboard focusability
- `onClick` handler preserved for mouse/touch interaction
- `onKeyDown` handler added for Enter and Space key activation (matching native button behavior)

The inner delete `<button>` remains unchanged. The outer element is no longer a semantic button, resolving the HTML validity issue while preserving all interactive behavior.

---

## B-003: Undefined CSS custom properties (CRITICAL)

**Problem:** Four CSS files referenced variable names that do not exist in `client/src/styles/variables.css`, causing properties to silently resolve to their initial values (effectively broken styles).

### Token Mapping Applied

| Nonexistent Variable | Replacement Token | Value |
|---|---|---|
| `--spacing-xs` | `--space-2` | 8px |
| `--spacing-sm` | `--space-3` | 12px |
| `--spacing-md` | `--space-4` | 16px |
| `--spacing-lg` | `--space-6` | 24px |
| `--spacing-xl` | `--space-8` | 32px |
| `--font-size-xs` | `--text-xs` | 12px |
| `--font-size-sm` | `--text-sm` | 14px |
| `--font-size-md` | `--text-base` | 16px |
| `--color-white` | `#fff` | white |
| `--color-error` | `--color-dusk-rose` | #E07A5F |
| `--shadow-lg` | `--shadow-elevated` | multi-layer shadow |
| `--color-sand-100` | `--bg-primary` | warm sand background |
| `--color-sand-200` | `--bg-card` | cream background |
| `--color-sand-300` | `--color-light-linen` | #F5F1EB |
| `--color-sand-400` | `--color-light-linen` | #F5F1EB |
| `--color-text-primary` | `--text-primary` | warm charcoal |
| `--color-text-secondary` | `--text-secondary` | soft graphite |
| `--color-text-muted` | `--text-muted` | muted stone |
| `--color-sunrise-gold-20` | `--color-sunrise-gold-15` | nearest available opacity variant |

### Files Changed

1. **`client/src/components/activities/Letter/LetterActivity.css`** -- 8 variable replacements
   - `--spacing-sm` x2, `--spacing-md` x2, `--spacing-lg` x2, `--spacing-xl` x1, `--spacing-xs` x1
   - `--font-size-md` x1, `--font-size-sm` x1, `--font-size-xs` x1
   - `--color-white` x1

2. **`client/src/components/activities/Letter/WritingPhase.css`** -- 5 variable replacements
   - `--color-sand-100` x1, `--color-sand-400` x1
   - `--color-text-primary` x2, `--color-text-muted` x1
   - `--color-sunrise-gold-20` x1

3. **`client/src/components/activities/MediaLibrary/MediaLibraryActivity.css`** -- 5 variable replacements
   - `--color-sand-300` x1
   - `--color-text-primary` x2, `--color-text-secondary` x2
   - `--color-error` x2

4. **`client/src/components/activities/MediaLibrary/PhotoGrid.css`** -- 4 variable replacements
   - `--color-sand-100` x1, `--color-sand-200` x1
   - `--color-text-muted` x1
   - `--shadow-lg` x1

---

## B-013: Touch target too small on MediaAttachment remove button (HIGH)

**File:** `client/src/components/common/MediaAttachment.css`

**Problem:** The `.media-attachment__remove` button had `width: 28px; height: 28px` with conflicting `min-width: 44px; min-height: 44px` overrides. The min-width/min-height effectively made the button 44px anyway, but the contradictory declarations are confusing and fragile.

**Fix:** Changed `width` and `height` to `44px` directly and removed the redundant `min-width`/`min-height` declarations. The button now meets the 44x44px touch target minimum required by the design system.

---

## Verification

All four CSS files were grep-checked after changes to confirm zero remaining references to nonexistent variable names. The PhotoGrid.tsx change preserves identical visual behavior and interaction patterns (click, keyboard, focus-visible outline) while eliminating the invalid HTML nesting.
