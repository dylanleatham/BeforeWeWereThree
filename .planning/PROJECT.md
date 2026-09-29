# Before We Were Three

## What This Is

An interactive babymoon web application for Dylan and partner — a curated collection of envelope-based activities designed to spark meaningful conversations, collaborative decision-making, and lasting keepsakes before their baby arrives. Features real-time two-device synchronization so both partners can participate independently while staying perfectly in sync.

## Core Value

**Two people, one screen each, sharing moments that matter.** Every feature serves the goal of encouraging conversation, eye contact, and shared reflection — not passive scrolling.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] PIN-gated access (Guest PIN for the experience, Admin PIN for configuration)
- [ ] Envelope system with sealed/opened/completed states and satisfying open animations
- [ ] Trivia activity with questions and answer reveals
- [ ] Would You Rather activity with two-participant voting and synchronized reveals
- [ ] Letters to Baby activity with prompts, text input, and optional photo attachment
- [ ] AI Baby Name Game with Love/Maybe/Nope voting, match detection, and multi-round support
- [ ] Dramatic Gender Reveal with two-key unlock ceremony
- [ ] Real-time two-device synchronization via SignalR
- [ ] Media library for photo uploads with Azure Blob Storage
- [ ] Spotify playlist integration (global, accessible from anywhere)
- [ ] PWA with offline shell and graceful reconnection
- [ ] 13 initial envelopes covering the full trip experience
- [ ] "Golden Hour Intimacy" visual design (warm, intimate, celebratory, timeless)

### Out of Scope

- Multi-couple support — this is for exactly two participants (Dylan and partner)
- Video uploads — photos only for v1 (storage/bandwidth costs)
- Real-time chat — the app encourages face-to-face conversation, not texting
- OAuth login — PIN-based access is simpler and sufficient
- Mobile native app — PWA covers mobile needs
- AI name pronunciation — not included per locked prompt contract
- Name gender classification — deliberately excluded for neutrality

## Context

**Personal project:** This is being built for the couple's actual babymoon trip. The deadline is the trip itself.

**Cultural context for Baby Name Game:** Names should function comfortably across cultures.

**Emotional design goals:**
- Encourage conversation, eye contact, and shared reflection
- Avoid passive scrolling; favor prompts and turn-based interactions
- Balance playfulness with sincerity ("fun, not goofy")
- Create keepsakes that feel appropriate when revisited in 20 years

**What this is NOT:**
- Baby shower aesthetic (no rubber ducks, rattles, or nursery tropes)
- Generic "tech app" minimalism
- Pastel overload or gender-reveal clichés (pink/blue binary)
- Overly playful or cartoon-like
- Cold, corporate, or clinical

**Existing documentation:**
- `docs/babymoon_portal_feature_blueprint.md` — Feature specifications and AI prompt contract
- `docs/babymoon_build_order.md` — Phased build plan with checkpoints
- `docs/babymoon_design_foundation.md` — Design system (colors, typography, spacing)
- `docs/bwwt_technical_patterns.md` — Technical standards and architecture patterns

## Constraints

- **Tech stack**: TypeScript (strict mode), React, Node.js/Express, PostgreSQL — non-negotiable
- **Infrastructure**: Azure (App Service, Front Door, Key Vault, PostgreSQL, SignalR, Blob Storage)
- **AI provider**: Anthropic API (Claude) for baby name generation
- **Domain**: beforewewerethree.com via Porkbun
- **CI/CD**: GitHub Actions
- **Testing**: Jest + React Testing Library — tests required before each phase checkpoint
- **Design**: Must follow "Golden Hour Intimacy" aesthetic and design tokens from style guide
- **Build philosophy**: Each phase must be deployed and verified in production before proceeding

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PIN-based auth over OAuth | Simpler for two known users; no account management needed | — Pending |
| Azure over AWS/GCP | Consistent ecosystem, good Node.js support, reasonable cost | — Pending |
| SignalR for real-time | Native Azure integration, handles reconnection well | — Pending |
| Anthropic for AI names | Quality of output, existing familiarity, locked prompt contract | — Pending |
| Monorepo structure | Shared types between client/server, unified deployment | — Pending |
| Phase-by-phase deployment | Prove infrastructure early, isolate bugs to latest layer | — Pending |

---
*Last updated: 2026-02-01 after initialization*
