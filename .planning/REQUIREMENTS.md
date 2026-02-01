# Requirements: Before We Were Three

**Defined:** 2026-02-01
**Core Value:** Two people, one screen each, sharing moments that matter.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Azure App Service deploys via GitHub Actions on push to main
- [ ] **INFRA-02**: Azure Front Door serves custom domain with HTTPS
- [ ] **INFRA-03**: Azure Key Vault stores secrets with Managed Identity access
- [ ] **INFRA-04**: PostgreSQL Flexible Server with Prisma migrations

### Authentication

- [ ] **AUTH-01**: User can enter Guest PIN to access the app
- [ ] **AUTH-02**: User can enter Admin PIN to access configuration mode
- [ ] **AUTH-03**: Session persists across browser refresh (JWT/cookie)
- [ ] **AUTH-04**: Two participants are distinguished (A vs B) by device

### UI Foundation

- [ ] **UI-01**: Envelope component displays sealed/opened/completed states
- [ ] **UI-02**: Opening envelope triggers satisfying animation
- [ ] **UI-03**: Design system uses Golden Hour tokens (colors, typography, spacing)
- [ ] **UI-04**: Layout is mobile-optimized with large touch targets

### Real-Time Sync

- [ ] **SYNC-01**: SignalR connection established between two devices
- [ ] **SYNC-02**: Partner presence indicator shows online/offline status
- [ ] **SYNC-03**: Voting activities reveal only after both participants submit
- [ ] **SYNC-04**: UI shows optimistic updates with sync status indicators

### Trivia Activity

- [ ] **TRIVIA-01**: User can view trivia question in envelope
- [ ] **TRIVIA-02**: User can submit answer and see correct answer revealed
- [ ] **TRIVIA-03**: Envelope marks complete after answer revealed

### Would You Rather Activity

- [ ] **WYR-01**: Both participants see same prompt with two options
- [ ] **WYR-02**: Each participant votes independently (choice hidden)
- [ ] **WYR-03**: Reveal shows both choices side-by-side after both vote
- [ ] **WYR-04**: Envelope marks complete after reveal

### Letters to Baby Activity

- [ ] **LETTER-01**: User can write letter with text input
- [ ] **LETTER-02**: User can attach photo from library or upload new
- [ ] **LETTER-03**: Letter auto-saves or explicitly saves
- [ ] **LETTER-04**: Envelope marks complete when both participants finish

### Baby Name Game Activity

- [ ] **NAME-01**: AI generates batch of names via Anthropic API
- [ ] **NAME-02**: Each name displays with origin, meaning, and notes
- [ ] **NAME-03**: User votes Love/Maybe/Nope on each name
- [ ] **NAME-04**: Match detection shows names both loved
- [ ] **NAME-05**: User can start new round with optional tweak input
- [ ] **NAME-06**: Previously shown/declined names never repeat

### Gender Reveal Activity

- [ ] **REVEAL-01**: Admin configures gender value and two keys
- [ ] **REVEAL-02**: Each participant enters their key
- [ ] **REVEAL-03**: Reveal triggers only when both keys validated server-side
- [ ] **REVEAL-04**: Full-screen ceremony with countdown and celebration
- [ ] **REVEAL-05**: Gender value never sent to client until both keys valid

### Media

- [ ] **MEDIA-01**: User can upload photos to Azure Blob Storage via SAS token
- [ ] **MEDIA-02**: User can browse media library of uploaded photos
- [ ] **MEDIA-03**: User can view photos in slideshow/shuffle mode
- [ ] **MEDIA-04**: Spotify playlist link accessible from app header

### Admin Mode

- [ ] **ADMIN-01**: Admin can set Guest PIN and Admin PIN
- [ ] **ADMIN-02**: Admin can configure Spotify playlist URL
- [ ] **ADMIN-03**: Admin can upload and delete photos in media library
- [ ] **ADMIN-04**: Admin can configure Gender Reveal (value + keys)
- [ ] **ADMIN-05**: Admin can create/edit envelopes
- [ ] **ADMIN-06**: Admin can create/edit WYR prompts, trivia questions, letter prompts

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### PWA & Offline

- **PWA-01**: App installable to home screen via manifest
- **PWA-02**: Service worker caches app shell for offline access
- **PWA-03**: Offline writes queued and synced on reconnection

### Enhanced Features

- **ENH-01**: Push notifications for partner activity
- **ENH-02**: Export letters and photos as keepsake PDF
- **ENH-03**: Sound design for reveals and celebrations
- **ENH-04**: Relationship reflection prompts (Us Then and Now, What We're Excited About)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-couple support | Personal project for exactly two participants (Dylan and partner) |
| Video uploads | Storage/bandwidth costs; photos sufficient for v1 |
| Real-time chat | Couples already have iMessage/WhatsApp; don't compete |
| OAuth login | PIN-based access simpler for two known users |
| Native mobile app | Responsive web app sufficient for babymoon trip |
| AI name pronunciation | Excluded per locked prompt contract |
| Name gender classification | Deliberately excluded for neutrality |
| Real-time collaborative text editing | Massively complex (CRDTs); overkill for separate letters |
| Social sharing | Gender, names, letters are private |
| Gamification/streaks | Undermines sincere, intimate tone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 2 | Pending |
| UI-04 | Phase 2 | Pending |
| SYNC-01 | Phase 3 | Pending |
| SYNC-02 | Phase 3 | Pending |
| SYNC-03 | Phase 3 | Pending |
| SYNC-04 | Phase 3 | Pending |
| WYR-01 | Phase 3 | Pending |
| WYR-02 | Phase 3 | Pending |
| WYR-03 | Phase 3 | Pending |
| WYR-04 | Phase 3 | Pending |
| LETTER-01 | Phase 4 | Pending |
| LETTER-02 | Phase 4 | Pending |
| LETTER-03 | Phase 4 | Pending |
| LETTER-04 | Phase 4 | Pending |
| MEDIA-01 | Phase 4 | Pending |
| MEDIA-02 | Phase 4 | Pending |
| MEDIA-03 | Phase 4 | Pending |
| MEDIA-04 | Phase 4 | Pending |
| NAME-01 | Phase 5 | Pending |
| NAME-02 | Phase 5 | Pending |
| NAME-03 | Phase 5 | Pending |
| NAME-04 | Phase 5 | Pending |
| NAME-05 | Phase 5 | Pending |
| NAME-06 | Phase 5 | Pending |
| TRIVIA-01 | Phase 6 | Pending |
| TRIVIA-02 | Phase 6 | Pending |
| TRIVIA-03 | Phase 6 | Pending |
| REVEAL-01 | Phase 7 | Pending |
| REVEAL-02 | Phase 7 | Pending |
| REVEAL-03 | Phase 7 | Pending |
| REVEAL-04 | Phase 7 | Pending |
| REVEAL-05 | Phase 7 | Pending |
| ADMIN-01 | Phase 1 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |
| ADMIN-04 | Phase 7 | Pending |
| ADMIN-05 | Phase 2 | Pending |
| ADMIN-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after initial definition*
