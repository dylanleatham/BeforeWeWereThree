# Phase 7: Gender Reveal Ceremony - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Two-key unlock mechanism that triggers a dramatic, full-screen ceremony revealing the baby's gender. Admin configures the gender value and two unique keys. Each participant enters their assigned key. The reveal triggers only when both keys are validated server-side. The gender value never reaches the client until both keys are valid. This is the emotional climax of the app.

</domain>

<decisions>
## Implementation Decisions

### Ceremony experience
- Visual build-up instead of numeric countdown — screen gradually transforms (colors shift, light intensifies) over a few seconds
- Warm glow reveal — gentle bloom of color radiating outward, intimate and aligned with Golden Hour aesthetic (not explosive confetti)
- Text appears with the visual — large, elegant "It's a Boy!" / "It's a Girl!" as part of the glow reveal
- Golden Hour color variants — warm rose tones for girl, warm sky/sage tones for boy (not traditional stark pink/blue)

### Key entry flow
- Simultaneous presence required — both participants must be online and enter keys in the same session (shared moment)
- Segmented code input — individual character boxes like a verification code, each character feels intentional and ceremonial
- Glowing anticipation while waiting — screen starts subtly shifting/glowing once one key is entered, building tension until the second arrives
- Wrong key: gentle shake + retry — input shakes subtly, clears, shows warm message ("That doesn't look right — try again"). Unlimited retries.

### Admin setup
- Short alphanumeric keys — 6-8 characters, easy to type on mobile
- Admin creates keys manually — types custom keys for each participant (can be personally meaningful)
- Gender selection: Boy or Girl only — simple binary matching ultrasound/blood test results
- Keys shown on screen only — admin sees both keys and shares them however they choose (text, whisper, physical card). App doesn't send anything.

### Post-reveal state
- Static keepsake view — no replay of the ceremony animation. Envelope opens to a beautiful static view showing the result.
- Keepsake shows gender + warm message — the result with a pre-written warm message like "This is the moment you found out"
- Envelope stays opened (never completes) — always accessible, users can return to the keepsake anytime without it looking "done"
- Admin can re-seal — admin can reset the reveal envelope specifically, clearing keys and result, useful for testing or if something went wrong

### Claude's Discretion
- Exact build-up animation timing and easing
- Specific warm rose / sky-sage color values within the Golden Hour palette
- Keepsake layout and typography
- Haptics pattern during reveal (if supported)
- Exact segmented input styling and character count
- How the glowing anticipation effect is implemented (particles, gradient shifts, etc.)

</decisions>

<specifics>
## Specific Ideas

- The ceremony should feel like the emotional climax of the entire app — the most dramatic visual moment
- Golden Hour palette variants (warm rose for girl, warm sky/sage for boy) keep the reveal cohesive with the app's aesthetic rather than jarring with stark pink/blue
- The segmented code input should feel ceremonial — each character entry building towards the moment
- The keepsake view should be something they'd want to screenshot and share

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-gender-reveal-ceremony*
*Context gathered: 2026-02-20*
