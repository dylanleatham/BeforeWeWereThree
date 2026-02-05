# Roadmap: Before We Were Three

## Overview

This roadmap transforms "Before We Were Three" from concept to working babymoon app across 7 phases. The journey starts with Azure infrastructure and PIN authentication, builds the envelope-based UI system, adds real-time two-device synchronization, then layers activities from simplest (Would You Rather) to most complex (Gender Reveal). Each phase delivers a verifiable, deployed capability before proceeding.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Azure Infrastructure & Foundation** - Deploy pipeline, secrets, database, PIN auth
- [x] **Phase 2: UI Foundation & Envelope Model** - Design system, envelope states, animations
- [ ] **Phase 3: Real-Time Sync & Would You Rather** - SignalR, presence, synchronized voting
- [ ] **Phase 4: Letters to Baby & Media** - Text input, photo uploads, media library
- [ ] **Phase 5: Baby Name Game & AI** - Anthropic API, voting, match detection
- [ ] **Phase 6: Trivia Activity** - Simple Q&A demonstrating pattern reuse
- [ ] **Phase 7: Gender Reveal Ceremony** - Two-key validation, secret protection, celebration

## Phase Details

### Phase 1: Azure Infrastructure & Foundation
**Goal**: Users can access the app via custom domain with PIN authentication
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, ADMIN-01
**Success Criteria** (what must be TRUE):
  1. User visits beforewewerethree.com and sees the app served over HTTPS
  2. User can enter Guest PIN and access the main experience
  3. User can enter Admin PIN and access configuration mode
  4. User session persists across browser refresh (no re-authentication)
  5. Two devices logged in with same Guest PIN are distinguished as Participant A vs B
**Plans**: 4 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md - Initialize monorepo, Express server, GitHub Actions CI/CD (Wave 1) -- Completed 2026-02-01
- [x] 01-02-PLAN.md - Front Door, custom domain, and HTTPS configuration (Wave 2) -- Completed 2026-02-01
- [x] 01-03-PLAN.md - Key Vault and PostgreSQL with Prisma migrations (Wave 2, parallel) -- Completed 2026-02-02
- [x] 01-04-PLAN.md - PIN authentication and session management (Wave 3) -- Completed 2026-02-02

### Phase 2: UI Foundation & Envelope Model
**Goal**: Users see a cohesive visual design with interactive envelopes
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-04, ADMIN-05
**Success Criteria** (what must be TRUE):
  1. App displays with Golden Hour aesthetic (warm colors, intimate typography)
  2. User sees envelopes in sealed, opened, or completed states
  3. Opening an envelope triggers a satisfying animation
  4. Admin can create and edit envelopes
  5. Layout works well on mobile with large touch targets
**Plans**: 4 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md - Design system tokens and base UI components (Wave 1) -- Completed 2026-02-02
- [x] 02-02-PLAN.md - Envelope data model, types, and API endpoints (Wave 1, parallel) -- Completed 2026-02-02
- [x] 02-03-PLAN.md - Envelope components with animation and haptics (Wave 2) -- Completed 2026-02-02
- [x] 02-04-PLAN.md - Pile navigation and admin envelope management (Wave 3) -- Completed 2026-02-04

### Phase 3: Real-Time Sync & Would You Rather
**Goal**: Two devices stay synchronized; both partners can vote and reveal together
**Depends on**: Phase 2
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, WYR-01, WYR-02, WYR-03, WYR-04
**Success Criteria** (what must be TRUE):
  1. User sees partner's online/offline status indicator
  2. Both participants see the same Would You Rather prompt
  3. Each participant votes independently without seeing partner's choice
  4. Reveal shows both choices side-by-side only after both have voted
  5. UI shows optimistic updates with sync status indicators
**Plans**: TBD

Plans:
- [ ] 03-01: Azure SignalR Service setup and connection handling
- [ ] 03-02: Presence indicators and reconnection logic
- [ ] 03-03: Would You Rather data model and voting API
- [ ] 03-04: Synchronized reveal and envelope completion

### Phase 4: Letters to Baby & Media
**Goal**: Users can write letters with photos; media library works
**Depends on**: Phase 3
**Requirements**: LETTER-01, LETTER-02, LETTER-03, LETTER-04, MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):
  1. User can write a letter with text input and it saves automatically
  2. User can upload photos to Azure Blob Storage
  3. User can attach a photo to their letter from library or upload new
  4. User can browse all uploaded photos in media library
  5. User can view photos in slideshow/shuffle mode
  6. Admin can configure Spotify playlist URL (visible in app header)
**Plans**: TBD

Plans:
- [ ] 04-01: Azure Blob Storage setup and SAS token generation
- [ ] 04-02: Photo upload flow with progress indicators
- [ ] 04-03: Letter writing interface with auto-save
- [ ] 04-04: Media library with slideshow mode
- [ ] 04-05: Spotify integration and admin media management

### Phase 5: Baby Name Game & AI
**Goal**: AI generates names; both partners vote and find matches
**Depends on**: Phase 3 (uses sync patterns)
**Requirements**: NAME-01, NAME-02, NAME-03, NAME-04, NAME-05, NAME-06
**Success Criteria** (what must be TRUE):
  1. User sees AI-generated names with origin, meaning, and notes
  2. Each user votes Love/Maybe/Nope on names independently
  3. Names both partners loved are highlighted as matches
  4. User can start a new round with optional style/tweak input
  5. Previously shown or declined names never repeat
**Plans**: TBD

Plans:
- [ ] 05-01: Anthropic API integration and prompt contract
- [ ] 05-02: Name display and voting UI
- [ ] 05-03: Match detection and results view
- [ ] 05-04: Multi-round flow with exclusion tracking

### Phase 6: Trivia Activity
**Goal**: Users can play trivia within envelope framework
**Depends on**: Phase 2 (envelope patterns)
**Requirements**: TRIVIA-01, TRIVIA-02, TRIVIA-03, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. User opens trivia envelope and sees question
  2. User can submit answer and see correct answer revealed
  3. Envelope marks complete after answer revealed
  4. Admin can create and edit trivia questions (and WYR prompts, letter prompts)
**Plans**: TBD

Plans:
- [ ] 06-01: Trivia data model and API
- [ ] 06-02: Trivia UI with answer reveal
- [ ] 06-03: Admin content management for all activity types

### Phase 7: Gender Reveal Ceremony
**Goal**: Two-key unlock triggers dramatic reveal; secret never leaks
**Depends on**: Phase 3 (sync), Phase 2 (animations)
**Requirements**: REVEAL-01, REVEAL-02, REVEAL-03, REVEAL-04, REVEAL-05, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Admin configures gender value and two unique keys (stored server-side only)
  2. Each participant enters their assigned key
  3. Reveal triggers only when both keys validated server-side
  4. Full-screen ceremony with countdown and celebration displays
  5. Gender value never sent to client until both keys valid (no DevTools leak)
**Plans**: TBD

Plans:
- [ ] 07-01: Gender reveal admin configuration
- [ ] 07-02: Two-key validation with constant-time operations
- [ ] 07-03: Ceremony animation sequence

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Foundation | 4/4 | Complete | 2026-02-02 |
| 2. UI Foundation & Envelope | 0/4 | Not started | - |
| 3. Real-Time Sync & WYR | 0/4 | Not started | - |
| 4. Letters & Media | 0/5 | Not started | - |
| 5. Baby Name Game & AI | 0/4 | Not started | - |
| 6. Trivia Activity | 0/3 | Not started | - |
| 7. Gender Reveal Ceremony | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-01*
*Depth: comprehensive*
*Total phases: 7*
*Total plans: 27*
