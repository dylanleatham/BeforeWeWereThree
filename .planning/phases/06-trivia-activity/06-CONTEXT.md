# Phase 6: Trivia Activity - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Trivia as a playable solo activity within the envelope framework, plus a unified admin content management page for creating/editing content across all activity types (trivia questions, WYR prompts, letter prompts). No new activity types or real-time sync requirements.

</domain>

<decisions>
## Implementation Decisions

### Question & answer format
- Multiple choice only (no free text)
- Multiple questions per envelope (mini quiz format)
- 2-4 answer options per question, admin chooses how many
- Content theme: pregnancy/baby fun facts
- Admin writes questions in a separate content library, then assigns to envelopes

### Reveal & couples dynamic
- Solo activity — no partner sync, no waiting for partner
- Brief suspense animation (1-2 seconds) before revealing correct/incorrect
- Each question has an optional "did you know" explanation written by admin, shown after reveal
- No score tracking — focus on the learning/fun experience, not competition

### Completion flow
- Linear navigation: one question at a time, answer, reveal, then "Next" to advance. No going back
- No question progress indicator (no "2 of 5") — questions just flow
- Warm completion screen after last question (consistent with other activities, e.g., "You learned some fun baby facts!")
- Envelope marks complete after finishing
- Completed envelopes can be reopened for read-only review of questions, answers, and explanations

### Admin content management
- Separate content library — questions are managed independently from envelopes
- One unified admin content page with tabs/sections for each type: Trivia, WYR, Letters
- Admin picks specific questions when creating/editing a trivia envelope
- Admin can drag-to-reorder questions within a trivia envelope

### Claude's Discretion
- Exact suspense animation style and timing
- Layout of multiple choice options (grid, list, etc.)
- Completion screen messaging and design
- Admin UI component patterns (forms, modals, inline editing)
- How the content library page is structured (tabs vs accordion vs separate routes)

</decisions>

<specifics>
## Specific Ideas

- Theme is pregnancy/baby trivia — "How big is baby at 20 weeks?" style fun facts
- No scoring keeps it relaxed and aligned with the Golden Hour aesthetic — this is about enjoying the moment, not competing
- Read-only review lets the couple revisit fun facts they learned later
- The "did you know" explanations add depth to the experience beyond just right/wrong

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-trivia-activity*
*Context gathered: 2026-02-19*
