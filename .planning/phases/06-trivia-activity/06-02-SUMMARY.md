---
phase: "06-trivia-activity"
plan: "02"
subsystem: "trivia-client"
tags: ["react", "hooks", "motion", "trivia", "ui-components", "css"]
dependencies:
  requires: ["06-01"]
  provides: ["trivia-ui", "trivia-hook", "trivia-envelope-wiring"]
  affects: ["06-03", "06-04"]
tech-stack:
  added: []
  patterns: ["solo-activity-hook", "phase-component-architecture"]
key-files:
  created:
    - "client/src/hooks/useTrivia.ts"
    - "client/src/components/activities/Trivia/QuestionPhase.tsx"
    - "client/src/components/activities/Trivia/QuestionPhase.css"
    - "client/src/components/activities/Trivia/RevealPhase.tsx"
    - "client/src/components/activities/Trivia/RevealPhase.css"
    - "client/src/components/activities/Trivia/CompletePhase.tsx"
    - "client/src/components/activities/Trivia/CompletePhase.css"
    - "client/src/components/activities/Trivia/ReviewPhase.tsx"
    - "client/src/components/activities/Trivia/ReviewPhase.css"
    - "client/src/components/activities/Trivia/TriviaActivity.tsx"
    - "client/src/components/activities/Trivia/TriviaActivity.css"
    - "client/src/components/activities/Trivia/index.ts"
  modified:
    - "client/src/services/api.ts"
    - "client/src/constants/strings.ts"
    - "client/src/constants/animation.ts"
    - "client/src/components/envelope/BaseEnvelope.tsx"
decisions:
  - id: "06-02-01"
    title: "Solo activity hook pattern (no SignalR)"
    choice: "useTrivia is dramatically simpler than useWouldYouRather -- no SignalR, no partner state, no optimistic updates"
    rationale: "Trivia is a solo activity per CONTEXT.md. Local option selection before submit, server is source of truth for correctness."
  - id: "06-02-02"
    title: "Separate local selection from submission"
    choice: "selectedAnswer is local state; submitAnswer sends to API"
    rationale: "Unlike WYR where a tap immediately votes, trivia has a two-step flow: select option, then confirm with Submit button. This prevents accidental answers."
  - id: "06-02-03"
    title: "No progress indicator per CONTEXT.md"
    choice: "TriviaActivity has no question counter (e.g., '2 of 5')"
    rationale: "CONTEXT.md specifies 'No question progress indicator -- questions just flow'. Keeps the experience relaxed and focused."
metrics:
  duration: "~6 min"
  completed: "2026-02-20"
---

# Phase 06 Plan 02: Trivia Client UI Components Summary

Complete trivia player UI with useTrivia hook, four phase components (Question, Reveal, Complete, Review), TriviaActivity orchestrator, and BaseEnvelope wiring for trivia-type envelopes.

## Performance

- **Duration:** ~6 minutes
- **Tasks:** 2/2 completed
- **Tests:** All passing (161 client + 314 server)

## Accomplishments

1. **API Client Functions** -- Added `getTriviaState` and `submitTriviaAnswer` to `client/src/services/api.ts` with proper typing from shared trivia types
2. **String Constants** -- 14 TRIVIA_* constants covering all UI text: submit, correct/incorrect, did-you-know, complete, review, error messages
3. **Animation Constants** -- Trivia-specific timing: 1.2s suspense, 400ms reveal, 600ms explanation delay, 800ms advance button delay, review stagger
4. **useTrivia Hook** -- Solo trivia state machine with phases: answering -> revealing -> complete/review. Handles local option selection, API submission, correctness reveal, mounted ref pattern
5. **QuestionPhase** -- Multiple choice with A/B/C/D letter labels, vertical option buttons with whileTap feedback, aria-pressed selection, submit button
6. **RevealPhase** -- Suspense pulse animation on selected option, correct (green) / incorrect (red) color overlays, check/cross marks, result text with scale-in, optional "Did you know?" explanation fade-in, delayed advance button
7. **CompletePhase** -- Warm "All Done!" screen with sparkle icon, "You learned some fun baby facts!" message, back-to-envelopes button
8. **ReviewPhase** -- Scrollable card-based read-only review of all questions with answer indicators, explanations, correct highlighting
9. **TriviaActivity Orchestrator** -- Phase switching with motion key transitions, loading spinner, error state with retry, non-blocking error banner for submission errors
10. **BaseEnvelope Wiring** -- `case 'trivia'` in renderActivityContent, trivia added to shouldRenderActivity for completed status (review mode)

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | API client, constants, useTrivia hook | e021306 | api.ts, strings.ts, animation.ts, useTrivia.ts |
| 2 | Phase components, orchestrator, BaseEnvelope wiring | 04cc16b | Trivia/*.tsx, Trivia/*.css, index.ts, BaseEnvelope.tsx |

## Files Created

- `client/src/hooks/useTrivia.ts` -- Solo trivia state machine hook
- `client/src/components/activities/Trivia/QuestionPhase.tsx` -- Question display with multiple choice options
- `client/src/components/activities/Trivia/QuestionPhase.css` -- Question phase styling
- `client/src/components/activities/Trivia/RevealPhase.tsx` -- Suspense animation and correct/incorrect reveal
- `client/src/components/activities/Trivia/RevealPhase.css` -- Reveal phase styling
- `client/src/components/activities/Trivia/CompletePhase.tsx` -- Warm completion screen
- `client/src/components/activities/Trivia/CompletePhase.css` -- Complete phase styling
- `client/src/components/activities/Trivia/ReviewPhase.tsx` -- Read-only review for completed envelopes
- `client/src/components/activities/Trivia/ReviewPhase.css` -- Review phase styling
- `client/src/components/activities/Trivia/TriviaActivity.tsx` -- Main orchestrator component
- `client/src/components/activities/Trivia/TriviaActivity.css` -- Orchestrator styling
- `client/src/components/activities/Trivia/index.ts` -- Barrel export

## Files Modified

- `client/src/services/api.ts` -- Added getTriviaState and submitTriviaAnswer functions
- `client/src/constants/strings.ts` -- Added 14 TRIVIA_* string constants
- `client/src/constants/animation.ts` -- Added 5 trivia animation timing constants
- `client/src/components/envelope/BaseEnvelope.tsx` -- Added trivia import, case 'trivia' in switch, shouldRenderActivity for completed trivia

## Decisions Made

1. **Solo hook pattern** -- useTrivia has no SignalR connection, no partner state, no optimistic updates. Server is source of truth for answer correctness. This is dramatically simpler than useWouldYouRather.
2. **Two-step answer flow** -- User selects an option (local state), then confirms by clicking Submit. This prevents accidental answers unlike WYR's single-tap voting.
3. **No progress indicator** -- Per CONTEXT.md: "No question progress indicator -- questions just flow." The orchestrator has no question counter header.

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

**Ready for 06-03 (Client Integration and Wiring):**
- All trivia UI components are built and wired into BaseEnvelope
- useTrivia hook connects to the trivia API endpoints from 06-01
- All shared types flow correctly from server to client
- No blockers for integration testing
