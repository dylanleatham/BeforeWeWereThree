# Codebase Review Backlog — 2026-02-25

## Executive Summary

The codebase is well-architected with strong patterns (shared types, service delegation, design system tokens, hooks-based state). However, the audit uncovered **7 critical issues** across security, data integrity, and HTML validity; **~20 high-priority issues** across race conditions, silent error swallowing, and code duplication; and **~30 medium/low issues** primarily around CSS token inconsistency and hardcoded strings.

**Top systemic concerns:**
1. **Friend PIN leakage** — PINs exposed through API responses and admin UI (security)
2. **CSS token drift** — 6+ CSS files use nonexistent design-system variables, silently breaking layout/colors
3. **Silent error swallowing** — Multiple admin mutation handlers have try/finally with no catch
4. **Hardcoded inline strings** — Pervasive CLAUDE.md Non-Negotiable #9 violation across admin/friend components
5. **Unguarded setTimeout/async cleanup** — Multiple components lack timer cleanup on unmount

## Codebase Health Score

**6.8 / 10** — Strong architecture, good test coverage on server side, well-designed hooks. Score held back by security concerns (PIN exposure), broken CSS across several features, missing error handling in admin UI, and a few race conditions in concurrent paths.

## Systemic Issues

| ID | Pattern | Domains Affected | Priority |
|----|---------|-----------------|----------|
| SYS-01 | **CSS token drift** — Files reference nonexistent variables (`--spacing-*`, `--font-size-*`, `--color-sand-*`, `--shadow-sm/md/lg`) that silently resolve to browser defaults | Activities A, Admin & Friends | CRITICAL |
| SYS-02 | **Friend PIN exposed in API responses and UI** — `toApiFriend()` includes raw PIN; admin UI renders it | DB/Types, Admin & Friends | CRITICAL |
| SYS-03 | **Hardcoded inline strings** — Dozens of user-facing strings inline in JSX instead of `STRINGS` constants | Admin & Friends, Activities A, Activities B | HIGH |
| SYS-04 | **Silent error swallowing in admin mutations** — try/finally with no catch in LetterContentTab, TriviaContentTab, WyrContentTab | Admin & Friends | HIGH |
| SYS-05 | **Unguarded setTimeout/async patterns** — Missing clearTimeout on unmount in PinEntry, BaseEnvelope, VotingPhase (WYR) | Core, Activities B | HIGH |
| SYS-06 | **Duplicated logic across components** — `hasCompletedView`, `formatEnvelopeTypeLabel`, envelope selector boilerplate, auth middleware | Core, Admin, Server API | MEDIUM |
| SYS-07 | **Raw pixel/hex values in CSS** — FriendManager.css, friend/*.css, MediaAttachment.css use hardcoded values instead of tokens | Admin & Friends, Core | MEDIUM |

## Master Backlog

### CRITICAL

| ID | Domain | File(s) | Issue | Estimated Effort |
|----|--------|---------|-------|-----------------|
| B-001 | DB/Types + Admin | `server/src/db/queries/friend.ts`, `shared/types/friend.ts`, `FriendManager.tsx` | **Friend PIN exposed in API responses and admin UI.** `toApiFriend()` includes raw PIN. Remove PIN from Friend type and API responses; return only on creation. | 30min |
| B-002 | Activities A | `MediaLibrary/PhotoGrid.tsx:48-77` | **Nested `<button>` inside `<button>` — invalid HTML.** Outer button wraps inner delete button. Breaks accessibility and causes undefined browser behavior. | 20min |
| B-003 | Activities A | `Letter/LetterActivity.css`, `Letter/WritingPhase.css`, `MediaLibrary/MediaLibraryActivity.css`, `MediaLibrary/PhotoGrid.css` | **Undefined CSS custom properties.** Files reference `--spacing-*`, `--font-size-*`, `--color-sand-*`, `--shadow-sm/md/lg`, `--color-text-*` which don't exist in `variables.css`. Layout and colors silently broken. | 45min |
| B-004 | Server API | `middleware/rateLimit.ts:70-76, 296-297` | **Rate limiter TOCTOU race condition.** Counter never properly resets when entry expires between get() and increment(). Attackers can bypass rate limits under concurrent load. | 30min |
| B-005 | Server API | `routes/envelopes.ts:86-93` | **Gender-reveal singleton check race condition.** Count-then-create outside a transaction. Two concurrent requests can both create gender-reveal envelopes. | 15min |
| B-006 | DB/Types | Prisma migrations vs schema.prisma | **Schema/migration FK mismatch.** 5 participant FK constraints have `ON DELETE RESTRICT` in live DB but `onDelete: Cascade` in schema. Direct participant deletion will throw FK violations. | 20min |
| B-007 | Server Services | `services/genderReveal.ts:287-305` | **`setGenderByFriend` has no `envelopeId` filter.** `findFirst()` without filtering by envelope returns arbitrary config if multiple exist. | 15min |

### HIGH

| ID | Domain | File(s) | Issue | Estimated Effort |
|----|--------|---------|-------|-----------------|
| B-008 | Admin | `LetterContentTab.tsx`, `TriviaContentTab.tsx`, `WyrContentTab.tsx` | **Silent error swallowing.** try/finally with no catch in admin mutation handlers. Users get no feedback when API calls fail. | 20min |
| B-009 | Core | `PinEntry.tsx:42-45`, `BaseEnvelope.tsx:63-66` | **Unguarded setTimeout with no cleanup.** Timer fires after unmount, calling handlers on stale closures. | 15min |
| B-010 | Core | `EnvelopePile.tsx:36-42`, `EnvelopeCard.tsx:32-38` | **Duplicated `hasCompletedView` logic.** Same five-type list in two files. CLAUDE.md #11 violation. | 10min |
| B-011 | Core | `BaseEnvelope.tsx:226-230`, `EnvelopeCard.tsx:41-44` | **Duplicated `formatEnvelopeTypeLabel` logic.** Same string formatting in two files. | 10min |
| B-012 | Core | `SignalRContext.tsx:197-198` | **Socket leak on unmount race.** Socket created after cleanup runs misses the cleanup guard. | 10min |
| B-013 | Core | `MediaAttachment.css:27-42` | **Touch target only 28x28px** on remove button despite min-width/min-height overrides. Violates 44px minimum. | 5min |
| B-014 | Activities A | `WritingPhase.tsx:79` | **Floating promise in handlePhotoChange.** `onSave()` return value not caught. Save errors silently swallowed. | 5min |
| B-015 | Activities A | `KeyEntryPhase.tsx:16,31-35` | **`keyLength` prop accepted but never used.** Hardcodes `PIN_LENGTH` (8) instead of using the prop. | 10min |
| B-016 | Activities B | `GeneratingPhase.tsx:32`, `WaitingPhase.tsx:24`, `WaitingForGuidancePhase.tsx:24` | **Triple `as unknown as number[]` casts.** PULSE_OPACITY_RANGE is readonly tuple, needs mutable type. | 5min |
| B-017 | Activities B | `PartnerPresence.tsx:45` | **Magic number 3000 when constant exists.** `PARTNER_TOAST_DURATION_MS` already in animation.ts. | 2min |
| B-018 | Activities B | `WouldYouRatherActivity.tsx:74` | **Empty prompts treated as error.** No prompts configured triggers permanent error screen with infinite retry loop. | 10min |
| B-019 | Activities B | `WaitingPhase.tsx:10-11` (WYR) | **Unused required prop `myChoice`.** Required in interface but never used in component. | 2min |
| B-020 | Server API | `middleware/auth.ts:27-57,87-124,131-168` | **Triplicated auth middleware logic.** Same cookie/JWT/participant lookup in authMiddleware, friendMiddleware, adminMiddleware. | 20min |
| B-021 | Server API | `routes/trivia.ts:115,141` | **Wrong error codes.** `PROMPT_NOT_FOUND` used for trivia questions; `ALREADY_VOTED` used for `ALREADY_ANSWERED`. Cross-domain semantics confusion. | 10min |
| B-022 | Server API | `routes/letter.ts:233-238`, `routes/wyr.ts:137` | **Fragile error detection via string matching.** `error.message.includes('Unique constraint')` instead of Prisma error code `P2002`. | 10min |
| B-023 | Server API | `routes/auth.ts:16-18` | **`safeCompare` leaks PIN length.** Early return on length mismatch defeats timing-safe comparison. | 5min |
| B-024 | Server Services | `services/wyr.ts:162-163` | **`isLastPrompt` logic inconsistent with `envelopeComplete`.** Based on sort order position, not actual completion. | 10min |
| B-025 | Server Services | `services/nameGame.ts:242-255` | **Non-transactional cleanup after generation failure.** Delete round + delete guidance not wrapped in transaction. | 10min |
| B-026 | Server Services | `services/participant.ts:104-136` | **Role-conversion race condition.** Count-then-assign without Serializable isolation. | 10min |
| B-027 | Admin | `FriendManager.tsx:282-292` | **Delete confirmation missing warning text.** String exists but never displayed. Data-loss risk. | 5min |
| B-028 | Hooks | `services/api.ts:275` | **`submitWyrVote` uses inline type instead of shared `WYRChoice`.** CLAUDE.md #3 violation. | 2min |
| B-029 | Hooks | `useLetter.ts:162` | **Debug console.log in production code.** `console.log('Partner submitted letter')` in SignalR handler. | 1min |
| B-030 | DB/Types | `shared/types/auth.ts:93-99` | **`Participant` type missing `friendId` field.** DB has it, types don't. | 5min |
| B-031 | DB/Types | `trivia_answers` migration | **Missing FK constraints on `question_id` and `envelope_id`.** Silent data integrity issues. | 15min |

### MEDIUM

| ID | Domain | File(s) | Issue | Estimated Effort |
|----|--------|---------|-------|-----------------|
| B-032 | Activities A | `KeepsakePhase.tsx:27-31` | Keepsake date shows current render time, not reveal timestamp | 15min |
| B-033 | Activities A | `SlideshowViewer.tsx:57-63` | useMemo runs shuffle unconditionally even when lightbox closed | 5min |
| B-034 | Activities A | `GenderRevealActivity.tsx:54-61` | aria-label on div without role — invisible to screen readers | 2min |
| B-035 | Activities A | `CeremonyPhase.css:79,87` | Hardcoded hex in text-shadow instead of CSS variables | 5min |
| B-036 | Admin | `TriviaQuestionForm.tsx:138-184` | Array index used as React key for mutable option list | 10min |
| B-037 | Admin | `FriendManager.tsx:150-153` | Error state renders in muted grey instead of error color | 2min |
| B-038 | Admin | `GenderRevealContentTab.css:123` | Hardcoded font-family instead of var(--font-mono) | 1min |
| B-039 | Admin/Friend CSS | `FriendManager.css`, `FriendDashboard.css`, etc. | Raw pixel/hex values instead of design tokens (SYS-07) | 30min |
| B-040 | Core | `MediaAttachment.css` | Hardcoded values should use design system variables | 10min |
| B-041 | Core | `PinEntry.tsx:72-73` | Raw `<h1>` and `<p>` instead of Heading/Text components | 5min |
| B-042 | Core | `SignalRContext.tsx:207` | `accessToken!` non-null assertion without guard | 2min |
| B-043 | Core | `Button.tsx:73` | Hardcoded animation duration 0.15 — should be constant | 2min |
| B-044 | Activities B | `SummaryPhase.css`, `ReviewPhase.css` | Raw pixel values instead of design-system tokens | 10min |
| B-045 | Activities B | `NewRoundPhase.tsx:8` | GUIDANCE_MAX_LENGTH local instead of in config.ts | 2min |
| B-046 | Server API | `routes/friend.ts:376` | Wrong error code: FRIEND_NOT_FOUND for missing letter | 2min |
| B-047 | Server API | `routes/health.ts:19-23` | Health route doesn't use successResponse helper | 2min |
| B-048 | Server API | `routes/signalr.ts:103-113` | Manual regex validation instead of Zod | 5min |
| B-049 | Server API | `routes/friend.ts:138-155` | DELETE returns 500 instead of 404 when friend not found | 2min |
| B-050 | Server Services | `services/anthropic.ts:155` | Stale hardcoded fallback model ID | 2min |
| B-051 | DB/Types | `db/queries/genderReveal.ts` | Missing explicit return types on all exported functions | 10min |
| B-052 | DB/Types | `db/queries/nameGame.ts:100-116` | N+1 pattern in createNames (individual creates instead of createMany) | 10min |
| B-053 | DB/Types | `db/queries/wyr.ts:112-132` | Race condition on sort order assignment | 10min |
| B-054 | Hooks | `useFriendLetter.ts` | Reimplements useAutoSave instead of composing it | 20min |
| B-055 | Hooks | `useNameGame.ts`, `useLetter.ts`, `useWouldYouRather.ts` | Dead `loadedRef` variable declared but never read | 5min |
| B-056 | Hooks | `useConfig.ts`, `useFriendDashboard.ts`, `useMediaLibrary.ts` | Missing mountedRef guards on async setState | 10min |
| B-057 | Admin | Inline strings across all admin/friend components (SYS-03) | ~50 inline strings that should be STRINGS constants | 45min |

### LOW

| ID | Domain | File(s) | Issue | Estimated Effort |
|----|--------|---------|-------|-----------------|
| B-058 | Core | `EnvelopePile.css:26-28` | position: absolute missing from CSS (applied inline) | 2min |
| B-059 | Core | `ContentTabs.tsx:27-33` | Unnecessary useCallback on stable ref function | 1min |
| B-060 | Core | `ErrorBoundary.tsx:12` | React.ErrorInfo instead of named import | 1min |
| B-061 | Core | `EnvelopeCard.tsx:59-64` | Inline onKeyDown instead of useCallback | 3min |
| B-062 | Core | `PinEntry.css:24` | Spacing token used as border-radius | 1min |
| B-063 | Activities A | `RevealPhase.tsx:13` | PREVIEW_LENGTH local instead of in config.ts | 2min |
| B-064 | Activities B | NameGame WaitingPhase/WaitingForGuidancePhase | Near-identical components should be one shared component | 10min |
| B-065 | Activities B | Multiple `<motion.button>` | Missing type="button" attribute | 3min |
| B-066 | Admin | Envelope selector boilerplate | Duplicate across 4 tab components | 20min |
| B-067 | Admin | Action button CSS classes | Duplicate across 4 CSS files | 15min |
| B-068 | Server API | All route files | Boilerplate participantId null-check in every handler | 15min |
| B-069 | DB/Types | `shared/types/nameGame.ts:97-102` | Deprecated schema still exported | 2min |
| B-070 | DB/Types | `shared/types/genderReveal.ts:109-115` | Incorrect "hashed" comment about plaintext keys | 1min |

## Implementation Sequence

### Wave 1: Security & Data Integrity (CRITICAL)
Must be done first — these are production risks.
1. **B-001** — Remove PIN from Friend API type and responses
2. **B-004** — Fix rate limiter TOCTOU race condition
3. **B-006** — Corrective migration for FK constraints
4. **B-007** — Add envelopeId filter to setGenderByFriend
5. **B-005** — Serializable transaction for gender-reveal singleton

### Wave 2: HTML Validity & Broken CSS (CRITICAL)
User-facing visual/functional issues.
6. **B-002** — Fix nested buttons in PhotoGrid
7. **B-003** — Fix all undefined CSS custom properties

### Wave 3: Error Handling & Async Safety (HIGH)
Prevent silent failures and cleanup races.
8. **B-008** — Add catch blocks to admin mutation handlers
9. **B-009** — Add timer cleanup to PinEntry and BaseEnvelope
10. **B-012** — Fix socket leak race in SignalRContext
11. **B-014** — Handle floating promise in WritingPhase
12. **B-022** — Use Prisma error codes instead of string matching
13. **B-023** — Fix timing-safe compare length leak
14. **B-025** — Wrap cleanup in transaction (nameGame)
15. **B-026** — Serializable isolation for participant role conversion
16. **B-027** — Display delete confirmation warning text

### Wave 4: Code Quality & Conventions (HIGH)
Fix violations of CLAUDE.md Non-Negotiables.
17. **B-010, B-011** — Extract shared envelope utilities
18. **B-013** — Fix touch target size
19. **B-015** — Use keyLength prop in KeyEntryPhase
20. **B-016** — Fix PULSE_OPACITY_RANGE type
21. **B-017** — Use constant for toast duration
22. **B-018** — Handle empty prompts state distinctly
23. **B-019** — Remove unused myChoice prop
24. **B-020** — Extract shared auth middleware
25. **B-021** — Fix trivia error codes
26. **B-024** — Fix isLastPrompt logic
27. **B-028** — Use shared WYRChoice type
28. **B-029** — Remove debug console.log
29. **B-030** — Add friendId to Participant type
30. **B-031** — Add missing FK constraints for trivia_answers

### Wave 5: Medium & Low (MEDIUM/LOW)
Everything else — CSS tokens, inline strings, minor refactors.
31-70. All remaining items in priority order within the wave.

## Estimated Total Effort

| Severity | Count | Estimated Time |
|----------|-------|---------------|
| CRITICAL | 7 | ~3 hours |
| HIGH | 24 | ~3 hours |
| MEDIUM | 26 | ~4 hours |
| LOW | 13 | ~1.5 hours |
| **Total** | **70** | **~11.5 hours** |
