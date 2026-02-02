# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Before We Were Three** is an interactive babymoon web application for expectant parents. It features collaborative activities (voting, trivia, letter writing, AI-powered baby name generation, and gender reveal) designed for real-time two-device synchronization.

**Status:** Design phase complete, pre-implementation. Comprehensive documentation exists in `/docs/`.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict mode) |
| Frontend | React 18+ |
| Backend | Node.js with Express |
| Database | PostgreSQL (Azure Flexible Server) |
| Real-time | Azure SignalR Service |
| Testing | Jest, React Testing Library |
| AI | Anthropic API (Claude for name generation) |
| Infrastructure | Azure (App Service, Front Door, Key Vault, Blob Storage) |

## Project Structure

```
/
├── client/                    # React frontend
│   └── src/
│       ├── components/
│       │   ├── common/        # Shared UI (Button, Card, Modal)
│       │   ├── envelope/      # Envelope system components
│       │   └── activities/    # Activity-specific components
│       ├── hooks/             # Custom React hooks
│       ├── services/          # API client functions
│       └── context/           # React context providers
├── server/                    # Node.js backend
│   └── src/
│       ├── routes/            # Express route handlers
│       ├── services/          # Business logic
│       ├── db/
│       │   ├── queries/       # Typed query functions
│       │   └── migrations/    # Numbered SQL migrations
│       └── middleware/        # Auth, validation, errors
├── shared/                    # Shared between client and server
│   └── types/                 # API contracts, shared interfaces
└── docs/                      # Design & architecture documentation
```

## Commands

```bash
npm run build          # Build client and server
npm test               # Run all tests (Jest)
npm run test:watch     # Watch mode testing
npm run lint           # TypeScript strict + ESLint
npm run dev            # Local development with hot reload
npm run db:migrate     # Run database migrations
```

## Architecture Patterns

### Envelope System
The app uses a composition pattern for activities. One `BaseEnvelope` component handles visual states, animations, and status persistence. Activity-specific components (Trivia, Would You Rather, Letter, Name Game, Gender Reveal) plug in as children.

### API Design
All responses use a consistent shape:
```typescript
{ success: true, data: T }
{ success: false, error: { code: string, message: string } }
```

Request validation uses Zod. Standard error codes: `ENVELOPE_NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_PIN`, etc.

### State Management
- Custom hooks for each domain: `useEnvelope`, `useTrivia`, `useSignalR`, `useSession`
- SignalR via React Context for real-time sync between two devices
- Components stay pure; hooks manage complexity

### Database
- Typed query functions in `/server/src/db/queries/` (no raw SQL in routes)
- Migrations: numbered SQL files (`001_*.sql`, `002_*.sql`)
- Connection via Key Vault reference (never hardcoded)

## Non-Negotiables

1. **TypeScript strict mode** — no `any`, no implicit nulls
2. **Tests before checkpoint** — no phase complete until tests pass
3. **Shared types** — API contracts in `/shared/types/`, imported by both client and server
4. **Base envelope pattern** — one component, many activities
5. **Consistent API responses** — same shape for success and error
6. **Typed database queries** — query functions, not raw SQL in handlers
7. **Custom hooks for state** — components stay pure
8. **Style guide adherence** — all UI references the design system

## Design System

**Aesthetic:** "Golden Hour Intimacy" — warm, intimate, celebratory, sincere, timeless.

**Typography:**
- Display/Headlines: Fraunces
- Body/UI: Source Sans 3

**Colors:** Use CSS variables, not hex values. Primary palette: Sunrise Gold (`#F4A261`), Warm Sand (`#FAF3E8`), Dusk Rose (`#E07A5F`), Deep Terracotta (`#BC6C4A`), Soft Sage (`#9DB5A0`).

**Touch targets:** Minimum 44x44px. Design for mobile-first, one-handed use.

See `docs/babymoon_design_foundation.md` for complete design tokens.

## Key Documentation

Load these for full context:
- `docs/bwwt_technical_patterns.md` — Technical standards and patterns
- `docs/babymoon_design_foundation.md` — Design system and tokens
- `docs/babymoon_portal_feature_blueprint.md` — Feature specifications
- `docs/babymoon_build_order.md` — Phased build plan with checkpoints

## Build Philosophy

Each phase results in a working, deployed checkpoint in production. New complexity is added only after the previous layer is confirmed working. When bugs occur, they are isolated to the most recently added layer.
