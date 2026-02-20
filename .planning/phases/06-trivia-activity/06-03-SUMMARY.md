---
phase: "06-trivia-activity"
plan: "03"
subsystem: "trivia-admin"
tags: ["react", "admin", "tabs", "drag-reorder", "motion", "aria", "crud"]
dependencies:
  requires: ["06-01", "06-02"]
  provides: ["trivia-admin-ui", "content-manager-shell", "trivia-question-crud", "trivia-envelope-assignment"]
  affects: ["06-04"]
tech-stack:
  added: []
  patterns: ["accessible-tabs", "drag-to-reorder", "content-library-crud"]
key-files:
  created:
    - "client/src/components/admin/ContentTabs.tsx"
    - "client/src/components/admin/ContentTabs.css"
    - "client/src/components/admin/ContentManager.tsx"
    - "client/src/components/admin/ContentManager.css"
    - "client/src/components/admin/TriviaContentTab.tsx"
    - "client/src/components/admin/TriviaContentTab.css"
    - "client/src/components/admin/TriviaQuestionForm.tsx"
    - "client/src/components/admin/TriviaQuestionForm.css"
    - "client/src/components/admin/TriviaEnvelopeAssigner.tsx"
    - "client/src/components/admin/TriviaEnvelopeAssigner.css"
  modified:
    - "client/src/services/api.ts"
    - "client/src/constants/strings.ts"
    - "client/src/components/admin/index.ts"
    - "client/src/App.tsx"
decisions:
  - id: "06-03-01"
    title: "ContentManager below EnvelopeManager in admin view"
    choice: "ContentManager rendered as a separate section below EnvelopeManager in App.tsx admin view"
    rationale: "No router needed. Simple vertical stacking keeps admin page as single scrollable view. ContentManager has its own heading and tab navigation."
  - id: "06-03-02"
    title: "Envelope select dropdown for assignment"
    choice: "Dropdown select for choosing which trivia envelope to manage, not inline per-envelope assigner"
    rationale: "Admin picks one envelope at a time to assign questions. Avoids rendering multiple assigners simultaneously."
  - id: "06-03-03"
    title: "Reload after add/remove for referential integrity"
    choice: "Re-fetch assigned questions from API after add/remove operations"
    rationale: "Ensures Reorder.Item values maintain proper referential identity from server data. Avoids Pitfall 4 from RESEARCH.md about derived objects breaking drag-to-reorder."
metrics:
  duration: "~7 min"
  completed: "2026-02-20"
---

# Phase 06 Plan 03: Admin Content Management Summary

Admin content management interface with accessible tabbed container, trivia question library CRUD, and question-to-envelope assignment with drag-to-reorder.

## Performance

- **Duration:** ~7 minutes
- **Tasks:** 2/2 completed
- **Tests:** All passing (161 client + 314 server)

## Accomplishments

1. **Admin API Client Functions** -- 7 new functions for trivia question CRUD (get, create, update, delete) and envelope assignment (get assigned, assign, reorder)
2. **String Constants** -- 20+ admin-specific string constants covering question form, library UI, and envelope assigner labels
3. **ContentTabs** -- Fully accessible WAI-ARIA tabs with keyboard navigation (ArrowRight/Left, Home/End), focus management, warm sunrise gold active indicator
4. **ContentManager** -- Tabbed container with Trivia (active), WYR (coming soon), Letters (coming soon) tabs. Tab panels use proper ARIA roles.
5. **TriviaQuestionForm** -- Create/edit form with dynamic 2-4 option inputs, correct answer radio buttons, optional explanation textarea, validation
6. **TriviaContentTab** -- Question library with CRUD: list with truncated preview, option count, explanation indicator, edit/delete with inline confirmation. Envelope assignment section with dropdown select.
7. **TriviaEnvelopeAssigner** -- Two-section layout: assigned questions with motion/react Reorder.Group drag-to-reorder and remove, available questions with add buttons. Save Order button appears on dirty state.
8. **App.tsx Integration** -- ContentManager wired into admin view below EnvelopeManager
9. **Admin Barrel Exports** -- Updated index.ts with all 7 admin component exports

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Admin API functions, ContentTabs, ContentManager shell, string constants | 18e5780 | api.ts, strings.ts, ContentTabs.tsx, ContentManager.tsx, App.tsx |
| 2 | TriviaContentTab, TriviaQuestionForm, TriviaEnvelopeAssigner | 0bd0e6c | TriviaContentTab.tsx, TriviaQuestionForm.tsx, TriviaEnvelopeAssigner.tsx, index.ts |

## Files Created

- `client/src/components/admin/ContentTabs.tsx` -- Accessible tab bar with WAI-ARIA keyboard navigation
- `client/src/components/admin/ContentTabs.css` -- Tab bar styling with active indicator
- `client/src/components/admin/ContentManager.tsx` -- Tabbed container for content management
- `client/src/components/admin/ContentManager.css` -- Container styling
- `client/src/components/admin/TriviaContentTab.tsx` -- Question library CRUD + envelope assignment
- `client/src/components/admin/TriviaContentTab.css` -- List and card styling
- `client/src/components/admin/TriviaQuestionForm.tsx` -- Create/edit question form
- `client/src/components/admin/TriviaQuestionForm.css` -- Form styling matching EnvelopeForm pattern
- `client/src/components/admin/TriviaEnvelopeAssigner.tsx` -- Drag-to-reorder assignment component
- `client/src/components/admin/TriviaEnvelopeAssigner.css` -- Assigner styling

## Files Modified

- `client/src/services/api.ts` -- Added 7 admin trivia API functions
- `client/src/constants/strings.ts` -- Added 20+ TRIVIA_ADMIN_* and TRIVIA_ASSIGNER_* constants
- `client/src/components/admin/index.ts` -- Added 5 new barrel exports
- `client/src/App.tsx` -- ContentManager imported and rendered in admin view

## Decisions Made

1. **ContentManager placement** -- Rendered below EnvelopeManager in App.tsx admin view as a separate section with its own heading and border-top separator. No router needed.
2. **Envelope select for assignment** -- Admin picks a trivia envelope from a dropdown to manage its questions. One assigner at a time, not inline per-envelope.
3. **Re-fetch after mutations** -- After adding/removing assignments, re-fetch from API to ensure Reorder.Item objects maintain referential identity (avoids Pitfall 4 from RESEARCH.md).

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

**Ready for 06-04 (Admin Content Management - WYR and Letters):**
- ContentManager shell with tabs exists, WYR and Letters tabs show "Coming soon" placeholder
- ContentTabs component is reusable for any tabbed interface
- TriviaContentTab establishes the pattern for WyrContentTab and LetterContentTab
- Admin barrel exports updated and ready for more components
