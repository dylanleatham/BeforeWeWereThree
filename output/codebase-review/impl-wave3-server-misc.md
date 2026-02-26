# Wave 3: Server Misc & Cross-Cutting Fixes

**Date:** 2026-02-25
**Issues Fixed:** B-051, B-053, B-034, B-035, B-063, B-065, B-069, B-070

---

## B-051: Missing explicit return types on genderReveal queries (MEDIUM)

**File:** `server/src/db/queries/genderReveal.ts`

Added `import type { GenderRevealConfig } from '@prisma/client'` and explicit return type annotations to all 7 exported functions:

- `getConfig()` -> `Promise<GenderRevealConfig | null>`
- `createConfig()` -> `Promise<GenderRevealConfig>`
- `updateConfig()` -> `Promise<GenderRevealConfig>`
- `deleteConfig()` -> already had `Promise<boolean>`
- `findGenderRevealConfig()` -> `Promise<GenderRevealConfig | null>`
- `setGenderValue()` -> `Promise<GenderRevealConfig>`
- `resetRevealState()` -> `Promise<GenderRevealConfig>`
- `setKeyValidated()` -> `Promise<GenderRevealConfig>`

---

## B-053: Race condition on WYR sort order assignment (MEDIUM)

**File:** `server/src/db/queries/wyr.ts`

**Problem:** Both `createPrompt()` and `createPromptsBulk()` called `getNextSortOrder()` outside of any transaction, creating a TOCTOU race where two concurrent requests could read the same sort order and create duplicates.

**Fix:**
- `getNextSortOrder()` now accepts an optional `tx?: Prisma.TransactionClient` parameter so it can run inside a transaction.
- `createPrompt()` wraps the sort order calculation and create in `db.$transaction()` when no explicit `sortOrder` is provided. When an explicit `sortOrder` is passed, no transaction is needed.
- `createPromptsBulk()` uses an interactive `db.$transaction(async (tx) => ...)` that calculates the start order and creates all prompts within the same transaction.

---

## B-034: aria-label on div without role (MEDIUM)

**File:** `client/src/components/activities/GenderReveal/GenderRevealActivity.tsx`

Added `role="status"` to the loading container div (line 53) so that the `aria-label` on its child spinner is semantically valid. Screen readers now correctly announce the loading state.

---

## B-035: Hardcoded hex in CeremonyPhase text-shadow (MEDIUM)

**Files:**
- `client/src/styles/variables.css` -- Added `--reveal-boy-glow-rgb: 168, 200, 216` and `--reveal-girl-glow-rgb: 240, 184, 168`
- `client/src/components/activities/GenderReveal/CeremonyPhase.css` -- Replaced `rgba(168, 200, 216, 0.3)` with `rgba(var(--reveal-boy-glow-rgb), 0.3)` and `rgba(240, 184, 168, 0.3)` with `rgba(var(--reveal-girl-glow-rgb), 0.3)`

---

## B-063: PREVIEW_LENGTH should be in config.ts (LOW)

**Files:**
- `client/src/constants/config.ts` -- Added `export const LETTER_PREVIEW_MAX_LENGTH = 60` under a new "Letter Configuration" section
- `client/src/components/activities/Letter/RevealPhase.tsx` -- Removed local `PREVIEW_LENGTH` constant, imported `LETTER_PREVIEW_MAX_LENGTH` from config, updated both usage sites

---

## B-065: Missing type="button" on motion.button elements (LOW)

Added `type="button"` to 10 `<motion.button>` elements across 8 files:

| File | Button |
|------|--------|
| `WouldYouRather/CompletePhase.tsx` | Close button |
| `WouldYouRather/SummaryPhase.tsx` | Close button |
| `WouldYouRather/RevealPhase.tsx` | Advance button |
| `Letter/RevealPhase.tsx` | "My letter" card button |
| `Letter/RevealPhase.tsx` | "Partner letter" card button |
| `Letter/RevealPhase.tsx` | Advance button |
| `Letter/CompletePhase.tsx` | Close button |
| `Trivia/ReviewPhase.tsx` | Close button |
| `Trivia/CompletePhase.tsx` | Close button |
| `Trivia/RevealPhase.tsx` | Advance button |
| `NameGame/ResultsPhase.tsx` | New round button |

Already correct (no change needed): `Button.tsx` (passes `type` prop), `WYR/VotingPhase.tsx`, `Trivia/QuestionPhase.tsx`, `NameGame/VotingPhase.tsx` (no motion.button).

---

## B-069: Deprecated schema still exported (LOW)

**Files:**
- `shared/types/nameGame.ts` -- Removed `generateNamesRequestSchema` and `GenerateNamesRequest` (both were `@deprecated`)
- `shared/types/index.ts` -- Removed `generateNamesRequestSchema` from value exports, removed `GenerateNamesRequest` from type re-exports

Verified: no remaining imports of either symbol in `server/` or `client/`.

---

## B-070: Incorrect "hashed" comment about plaintext keys (LOW)

**File:** `shared/types/genderReveal.ts`

Changed the `GenderRevealAdminResponse` JSDoc from:
> "Keys are hashed in the database; admin re-enters them when editing"

To:
> "Admin re-enters keys when editing"

The keys are stored as plaintext date strings (MMDDYYYY), not hashed.
