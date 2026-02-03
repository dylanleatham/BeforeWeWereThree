# Phase 2: UI Foundation & Envelope Model - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the visual design system and interactive envelope components. Users see a cohesive Golden Hour aesthetic with envelopes in sealed, opened, or completed states. Opening envelopes triggers satisfying animations. Admin can create and edit envelopes. Layout works well on mobile with large touch targets.

</domain>

<decisions>
## Implementation Decisions

### Envelope interactions
- Single tap to open (no hold or swipe required)
- Medium flourish animation (~400-500ms) — satisfying but not slow
- Subtle haptic feedback on mobile when envelope opens
- Users can close and return to pile — tapping outside or close button returns to navigation, envelope stays in 'opened' state

### Envelope layout (stacked pile)
- Envelopes displayed as stacked pile, not grid
- Peek-and-flip navigation: tap to peek at next envelope, swipe to move through stack
- Completed envelopes stay in pile but look visually distinct (not moved to separate area)
- Activity label visible on each envelope (e.g., "Would You Rather", "Letter to Baby")
- **Note:** This overrides the grid layout shown in `babymoon_design_foundation.md` and `babymoon_style_guide.jsx` — update those docs during implementation

### State communication
- **Sealed:** Ribbon tied around envelope — gift-like, romantic feel
- **Opened:** Flap open, ribbon untied/hanging loose — clearly in progress
- **Completed:** Heart stamp or checkmark badge in corner — done indicator
- Partner presence indicator on individual envelopes (small indicator if partner has this envelope open)

### Golden Hour aesthetic
- Implement per existing design docs: `docs/babymoon_design_foundation.md` and `docs/babymoon_style_guide.jsx`
- Colors, typography, spacing, motion timing already defined
- Use CSS variables from design system, not hardcoded values

### Claude's Discretion
- Exact pile stacking/offset angles
- Loading skeleton design
- Error state handling patterns
- Precise ribbon/bow illustrations vs abstract representation
- Close button placement and style

</decisions>

<specifics>
## Specific Ideas

- Ribbon-tied sealed envelopes (not wax seal) — gift-like aesthetic
- Stacked pile feels like physical mail you'd flip through
- Labels visible so users know what each envelope contains before opening

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-ui-foundation-envelope-model*
*Context gathered: 2026-02-02*
