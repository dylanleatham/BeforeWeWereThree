# Phase 1: Azure Infrastructure & Foundation - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy Azure infrastructure with custom domain, PIN-based authentication, and session management. Users access the app via beforewewerethree.com with HTTPS, authenticate with a PIN, and maintain persistent sessions. Two devices logged in with the same Guest PIN are distinguished as Participant A vs B.

</domain>

<decisions>
## Implementation Decisions

### PIN Entry Experience
- Warm & welcoming visual feel — soft colors, small illustration or icon, feels like entering a special space
- PIN format is a date: MMDDYYYY (8 digits) — personal and memorable for expectant parents
- Wrong PIN handling: gentle shake animation + input clears + friendly message ("Hmm, that's not it. Try again?")

### Participant Identity
- Implicit identification only — system tracks A vs B internally, users don't see which they are
- Device fingerprint determines identity — same device always gets same participant assignment across sessions
- Third device with Guest PIN gets read-only mode — can view but not participate in activities
- Admin can reset participant assignments if needed

### Session Behavior
- Long-lived sessions (30 days) — babymoon is a short period, stay logged in the whole time
- No explicit logout needed — just close browser; session persists until timeout
- Same participant on multiple tabs/devices works fine — synced state across all
- Expired sessions: silent re-auth — show PIN screen again without warning message

### Admin vs Guest Modes
- Subtle visual indicator for admin mode — small badge or border color, doesn't change overall look
- Separate sessions required to switch modes — must clear session or use incognito, no easy switching
- No preview mode — admin uses separate browser to see guest view
- Admin home screen is config dashboard — settings, envelope management, activity setup (not participant view)

### Claude's Discretion
- Exact PIN input component styling within warm aesthetic
- Device fingerprinting implementation approach
- Session token storage mechanism
- Specific shake animation timing and easing

</decisions>

<specifics>
## Specific Ideas

- Date-based PIN (MMDDYYYY) ties nicely to babymoon theme — likely due date or anniversary
- "Entering a special space" feel for login — intimate, not corporate
- Read-only mode for third devices allows sharing with family without breaking the two-person experience

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-azure-infrastructure-foundation*
*Context gathered: 2026-02-01*
