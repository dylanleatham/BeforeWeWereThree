# Phase 3: Real-Time Sync & Would You Rather - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Two devices staying synchronized with presence awareness while partners independently vote on Would You Rather prompts and reveal choices together. This phase establishes the real-time infrastructure (SignalR) and delivers the first synchronized activity.

</domain>

<decisions>
## Implementation Decisions

### Presence Display
- Show partner status **within activity only** (not persistent in app header)
- Use **green/gray dot** indicator — green when online, gray when offline
- **Subtle toast** when partner joins/leaves activity (auto-dismiss)
- Just show offline state — no "last seen" timestamp or nudge prompts

### Voting Interaction
- **Swipe left/right** to select choice — gestural and decisive
- After voting, **transition to waiting screen** — leave options entirely, show "Waiting for [Partner]..."
- **No take-backs** — once swiped, vote is locked
- **Subtle hint first time only** — small arrow/text on first WYR, then trust they know

### Reveal Ceremony
- **Quick and playful** reveal — fast flip/slide, keeps momentum
- Display both choices **side by side** — "Your choice | Partner's choice"
- **Celebrate matches** — visual flourish when both picked same option
- **Manual advance** — "Next" button after reveal, gives time to discuss

### Connection Handling
- **Subtle reconnecting indicator** when connection drops — doesn't interrupt experience
- **Block voting when offline** — can't vote without connection, ensures real-time integrity
- **Resume exactly where you were** on reconnect — same prompt, same state
- **No sync indicator during normal operation** — trust it's working unless problem occurs

### Claude's Discretion
- Exact animation timing and easing for reveal
- Toast styling and duration
- Swipe hint visual design
- Match celebration visual (confetti vs glow vs other)

</decisions>

<specifics>
## Specific Ideas

- Swipe gesture should feel decisive — commit to your choice
- Waiting screen keeps anticipation without revealing anything
- Match celebration should be noticeable but not over-the-top — fits intimate aesthetic
- Manual advance respects that this is a conversation starter, not just a game

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-real-time-sync-would-you-rather*
*Context gathered: 2026-02-06*
