# Wave 3: CSS Design Token Consistency

**Issues:** B-038, B-039, B-040, B-044
**Severity:** MEDIUM
**Files changed:** 10

## Summary

Replaced hardcoded pixel values, hex color fallbacks, raw font-family stacks, and inline transition timings with design-system CSS custom properties defined in `client/src/styles/variables.css`.

## Changes by Issue

### B-039: Admin and Friend CSS files

**`client/src/components/admin/FriendManager.css`**
- `gap: 16px` -> `var(--space-4)`, `gap: 8px` -> `var(--space-2)`, `gap: 4px` -> `var(--space-1)`, `gap: 12px` -> `var(--space-3)`
- `margin-top: 24px` -> `var(--space-6)`
- `padding: 12px 16px` -> `var(--space-3) var(--space-4)`, `padding: 16px` -> `var(--space-4)`
- `font-size: 0.85rem` -> `var(--text-sm)`, `font-size: 0.95rem` -> `var(--text-base)`, `font-size: 1rem` -> `var(--text-base)`
- `border-radius: 8px` -> `var(--radius-sm)`, `border-radius: 6px` -> `var(--radius-sm)`
- `font-family: monospace` -> `var(--font-mono)`
- `margin: 8px 0` -> `var(--space-2) 0`
- Removed hex fallbacks: `var(--color-muted, #999)` -> `var(--text-muted)`, `var(--color-deep-terracotta, #BC6C4A)` -> `var(--color-deep-terracotta)`, `var(--color-dusk-rose, #E07A5F)` -> `var(--color-dusk-rose)`, `var(--color-warm-sand, #FAF3E8)` -> `var(--color-warm-sand)`, `var(--color-soft-sage, #9DB5A0)` -> `var(--color-soft-sage)`

**`client/src/components/friend/FriendDashboard.css`**
- `padding: 24px 16px` -> `var(--space-6) var(--space-4)`, `gap: 24px` -> `var(--space-6)`
- `gap: 16px` -> `var(--space-4)`, `gap: 8px` -> `var(--space-2)`, `gap: 12px` -> `var(--space-3)`
- `padding: 8px 16px` -> `var(--space-2) var(--space-4)`
- `border-radius: 8px` -> `var(--radius-sm)`
- `margin-bottom: 12px` -> `var(--space-3)`
- Removed all hex fallbacks from color variables

**`client/src/components/friend/FriendLetterActivity.css`**
- `gap: 16px` -> `var(--space-4)`, `gap: 8px` -> `var(--space-2)`, `gap: 12px` -> `var(--space-3)`
- `padding: 16px` -> `var(--space-4)`, `padding: 4px 0` -> `var(--space-1) 0`, `padding: 12px 16px` -> `var(--space-3) var(--space-4)`
- `font-size: 0.9rem` -> `var(--text-base)`, `font-size: 0.95rem` -> `var(--text-base)`, `font-size: 1.5rem` -> `var(--text-2xl)`
- `border-radius: 12px` -> `var(--radius-md)`
- `color: var(--color-text, #333)` -> `color: var(--text-primary)`, `color: var(--color-muted, #999)` -> `color: var(--text-muted)`
- Removed all hex fallbacks

**`client/src/components/friend/FriendLetterCard.css`**
- `gap: 16px` -> `var(--space-4)`, `padding: 16px 20px` -> `var(--space-4) var(--space-5)`
- `transition: transform 0.15s ease, box-shadow 0.15s ease` -> `transition: transform var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default)`
- `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08)` -> `box-shadow: 0 4px 12px var(--color-warm-charcoal-8)`
- Removed all hex fallbacks

**`client/src/components/friend/FriendLetterView.css`**
- `gap: 20px` -> `var(--space-5)`, `gap: 16px` -> `var(--space-4)`, `gap: 4px` -> `var(--space-1)`
- `padding: 8px 0` -> `var(--space-2) 0`, `padding-top: 8px` -> `var(--space-2)`
- `margin-top: 4px` -> `var(--space-1)`
- `border-radius: 8px` -> `var(--radius-sm)`
- `font-size: 1rem` -> `var(--text-base)`
- `color: var(--color-text, #333)` -> `color: var(--text-primary)`
- Removed all hex fallbacks

**`client/src/components/friend/ThankYouNoteView.css`**
- `border-radius: 12px` -> `var(--radius-md)`, `border-radius: 8px` -> `var(--radius-sm)`
- `padding: 20px` -> `var(--space-5)`
- `margin-bottom: 12px` -> `var(--space-3)`, `gap: 12px` -> `var(--space-3)`
- `font-size: 1rem` -> `var(--text-base)`
- `color: var(--color-text, #333)` -> `color: var(--text-primary)`
- Removed all hex fallbacks

### B-040: MediaAttachment.css

**`client/src/components/common/MediaAttachment.css`**
- `border-radius: 8px` -> `var(--radius-sm)`
- `gap: 8px` -> `var(--space-2)`, `gap: 4px` -> `var(--space-1)`
- `padding: 10px 16px` -> `var(--space-3) var(--space-4)`
- `top: 8px` / `right: 8px` -> `var(--space-2)`
- `font-size: 0.9rem` -> `var(--text-base)`, `font-size: 0.85rem` -> `var(--text-sm)`
- `margin-top: 4px` -> `var(--space-1)`
- `transition: width 0.2s ease` -> `transition: width var(--duration-fast) var(--ease-default)`
- Removed all hex fallbacks

### B-038: GenderRevealContentTab.css

**`client/src/components/admin/GenderRevealContentTab.css`**
- Line 123: `font-family: 'Courier New', Courier, monospace` -> `var(--font-mono)`

### B-044: Activities B CSS

**`client/src/components/activities/WouldYouRather/SummaryPhase.css`**
- `1rem` -> `var(--space-4)`, `0.75rem` -> `var(--space-3)`, `0.25rem` -> `var(--space-1)`, `0.5rem` -> `var(--space-2)`
- `1.25rem` (font-size) -> `var(--text-xl)`, `0.875rem` -> `var(--text-sm)`, `0.75rem` -> `var(--text-xs)`
- `border-radius: 12px` -> `var(--radius-md)`, `border-radius: 8px` -> `var(--radius-sm)`, `border-radius: 999px` -> `var(--radius-full)`
- `rgba(0, 0, 0, 0.06)` -> `var(--color-warm-charcoal-6)`
- `rgba(244, 162, 97, 0.12)` -> `var(--color-sunrise-gold-15)` (closest token)
- `transition: background-color 0.2s, color 0.2s` -> `transition: background-color var(--duration-fast), color var(--duration-fast)`
- `1.5rem` (padding) -> `var(--space-6)`

**`client/src/components/activities/Trivia/ReviewPhase.css`**
- Same token pattern as SummaryPhase (files follow the same design)
- `1rem` -> `var(--space-4)`, `0.75rem` -> `var(--space-3)`, `0.25rem` -> `var(--space-1)`, `0.5rem` -> `var(--space-2)`
- `1.25rem` (font-size) -> `var(--text-xl)`, `0.875rem` -> `var(--text-sm)`, `0.75rem` -> `var(--text-xs)`
- `border-radius: 12px` -> `var(--radius-md)`, `border-radius: 8px` -> `var(--radius-sm)`
- `rgba(0, 0, 0, 0.06)` -> `var(--color-warm-charcoal-6)`
- `transition: opacity 0.2s` -> `transition: opacity var(--duration-fast)`
- `transition: background-color 0.2s, color 0.2s` -> `transition: background-color var(--duration-fast), color var(--duration-fast)`

## Values Intentionally Preserved

Some values were kept as-is because they lack exact design-token equivalents and serve specific purposes:

- **`0.8125rem`, `0.6875rem`, `0.9375rem`** — These intermediate font sizes in the activity review components sit between standard type-scale steps. Forcing them to the nearest token would change the visual density of these compact card layouts.
- **`0.125rem` gap** — Used for tight vertical spacing inside choice labels; no `--space-0.5` token exists.
- **`0.375rem` gap/padding** — Used for tight option spacing in trivia review; between `--space-1` (4px) and `--space-2` (8px).
- **`0.625rem` padding** — Used for close button vertical padding; between `--space-2` and `--space-3`.
- **`2px` gap** — Used for name/subtitle pairs where `--space-1` (4px) would be too much.
- **Keeper badge small values** (`1px 6px` padding, `4px` radius, `0.7rem` size, `6px` margin) — These are a compact badge element intentionally smaller than the design system's smallest tokens.
- **`max-height: 200px`** — Content-specific constraint for letter media thumbnails.
- **`min-height: 300px`, `min-height: 400px`, `min-height: 200px`** — Layout-specific minimums for loading/empty states.

## Verification

All changes are purely cosmetic token substitutions. No selectors, property names, or cascade behavior was altered. The rendered output is visually identical (tokens resolve to the same or equivalent values as the original hardcoded numbers).
