---
phase: "06-trivia-activity"
plan: "04"
subsystem: "admin-content-management"
tags: ["react", "admin", "wyr", "letter", "crud", "tabs", "api"]
dependencies:
  requires: ["06-03"]
  provides: ["wyr-content-tab", "letter-content-tab", "unified-admin-content-management"]
  affects: []
tech-stack:
  added: []
  patterns: ["envelope-scoped-crud", "single-prompt-per-envelope"]
key-files:
  created:
    - "client/src/components/admin/WyrContentTab.tsx"
    - "client/src/components/admin/WyrContentTab.css"
    - "client/src/components/admin/LetterContentTab.tsx"
    - "client/src/components/admin/LetterContentTab.css"
  modified:
    - "client/src/components/admin/ContentManager.tsx"
    - "client/src/components/admin/index.ts"
    - "client/src/services/api.ts"
    - "client/src/constants/strings.ts"
    - "server/src/routes/letter.ts"
decisions:
  - id: "06-04-01"
    title: "Admin endpoint for letter prompt by envelope"
    choice: "Added GET /letters/prompt/envelope/:envelopeId admin route"
    rationale: "Existing GET /letters/:envelopeId requires auth and returns full letter state with participant data. Admin needs a clean prompt-only lookup by envelope ID."
metrics:
  duration: "~6 min"
  completed: "2026-02-20"
---

# Phase 06 Plan 04: WYR and Letter Content Tabs Summary

WYR and Letter admin content tabs with full CRUD, plus GET /letters/prompt/envelope/:envelopeId admin endpoint. All three ContentManager tabs now functional (ADMIN-06 complete).

## Performance

- **Duration:** ~6 minutes
- **Tasks:** 2/2 completed
- **Tests:** All passing (161 client + 314 server)

## Accomplishments

1. **WyrContentTab** -- Envelope-scoped WYR prompt management. Dropdown to select a would-you-rather envelope, prompt list showing Option A/B with sort order, inline create/edit form with two textareas, delete with confirmation.
2. **LetterContentTab** -- Envelope-scoped letter prompt management. Dropdown to select a letter envelope, single prompt display (1:1 relationship), create/edit/delete with confirmation. Simpler than WYR since each letter envelope has at most one prompt.
3. **Admin API additions** -- `getWyrPromptsForEnvelope()` and `getLetterPromptForEnvelope()` client API functions. Server-side `GET /letters/prompt/envelope/:envelopeId` admin endpoint for prompt lookup by envelope.
4. **ContentManager wiring** -- Replaced "Coming soon" placeholders with real WyrContentTab and LetterContentTab components. All three tabs (Trivia, WYR, Letters) fully functional.
5. **String constants** -- 20+ new WYR_ADMIN_* and LETTER_ADMIN_* constants for admin UI text.
6. **Barrel exports** -- Updated admin/index.ts with WyrContentTab and LetterContentTab exports.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | WyrContentTab and LetterContentTab | 89a3f60 | WyrContentTab.tsx, LetterContentTab.tsx, api.ts, strings.ts, letter.ts (server) |
| 2 | Wire ContentManager into admin view | bb72d48 | ContentManager.tsx, index.ts |

## Files Created

- `client/src/components/admin/WyrContentTab.tsx` -- WYR prompt CRUD per envelope
- `client/src/components/admin/WyrContentTab.css` -- WYR tab styling
- `client/src/components/admin/LetterContentTab.tsx` -- Letter prompt CRUD per envelope
- `client/src/components/admin/LetterContentTab.css` -- Letter tab styling

## Files Modified

- `client/src/components/admin/ContentManager.tsx` -- Replaced Coming soon with real tab components
- `client/src/components/admin/index.ts` -- Added 2 new barrel exports
- `client/src/services/api.ts` -- Added getWyrPromptsForEnvelope and getLetterPromptForEnvelope
- `client/src/constants/strings.ts` -- Added 20+ WYR_ADMIN_* and LETTER_ADMIN_* constants
- `server/src/routes/letter.ts` -- Added GET /letters/prompt/envelope/:envelopeId admin endpoint

## Decisions Made

1. **Admin endpoint for letter prompt by envelope** -- Added `GET /letters/prompt/envelope/:envelopeId` because the existing `GET /letters/:envelopeId` is participant-scoped and returns full letter state. Admin needs a clean prompt-only lookup. [Rule 3 - Blocking]

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added GET /letters/prompt/envelope/:envelopeId admin endpoint**
- **Found during:** Task 1
- **Issue:** No server endpoint existed to get a letter prompt by envelope ID for admin management. The existing `GET /letters/:envelopeId` requires participant auth and returns full letter state.
- **Fix:** Added admin-only endpoint using existing `getPromptByEnvelopeId` query function
- **Files modified:** `server/src/routes/letter.ts`
- **Commit:** 89a3f60

## Phase 6 Complete

All 4 plans in Phase 6 (Trivia Activity) are now complete:
- 06-01: Trivia backend foundation (schema, routes, services)
- 06-02: Client UI components (TriviaActivity, question flow, completion)
- 06-03: Admin content management shell (ContentTabs, TriviaContentTab, TriviaEnvelopeAssigner)
- 06-04: WYR and Letter content tabs (WyrContentTab, LetterContentTab, ContentManager wiring)

ADMIN-06 requirement fully met: admin can create/edit/delete trivia questions, WYR prompts, and letter prompts from a single unified content management interface.
