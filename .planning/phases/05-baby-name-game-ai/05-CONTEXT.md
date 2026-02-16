# Phase 5: Baby Name Game & AI - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

AI generates baby names with origin, meaning, and notes. Both partners independently vote Love/Maybe/Nope on names in a swipeable card interface, then see results with matches highlighted. Multiple rounds supported with free-text AI guidance. Previously declined names never repeat. Matches accumulate across rounds.

</domain>

<decisions>
## Implementation Decisions

### Name presentation
- One name at a time, card-based (Tinder-style flow)
- All info visible on card upfront: name, origin, meaning, and AI-generated note
- AI notes use a mix of factual and personal tone (brief origin/context plus a short evocative line)
- Progress indicator showing "3 of 10" style count for current round

### Voting interaction
- Swipe gestures: right for Love, left for Nope, down for Maybe
- No take-backs — once voted, move forward only
- Both partners see the same set of names per round, but in shuffled (randomized) order per person
- After finishing voting, show "Waiting for partner..." state (same pattern as WYR)

### Match reveal & results
- All results shown at once (not one-at-a-time reveal)
- Matches (both loved) highlighted at top
- Near-misses shown when zero matches (one loved + one maybe)
- "Maybe" overlaps (both said maybe) shown as a separate "Worth discussing" section below matches
- Matches accumulate across rounds — a persistent running list of matched names

### Round flow & AI guidance
- 10 names per round
- First round requires no input — generates diverse mix automatically
- Subsequent rounds offer a free text prompt for guidance ("More Italian names", "Something short and modern")
- Activity never "completes" — always available for more rounds (like media library)
- Previously shown or declined names excluded from future rounds

### Claude's Discretion
- Card animation and swipe physics (consistent with existing gesture patterns in app)
- AI prompt engineering for name generation
- Exact layout of results view
- Loading states while AI generates names
- How the persistent matched names list is displayed within the activity

</decisions>

<specifics>
## Specific Ideas

- Follows the WYR pattern: independent action, waiting phase, then shared reveal
- Near-miss feature softens rounds with no Love+Love matches — "Almost matched on these!"
- "Worth discussing" section for double-maybes encourages conversation between partners
- Free text for AI guidance gives maximum flexibility without overwhelming with preset options

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-baby-name-game-ai*
*Context gathered: 2026-02-15*
