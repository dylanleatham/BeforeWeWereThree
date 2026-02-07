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
│       ├── constants/         # Centralized constants (strings, config, animation)
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
9. **Centralized constants** — no magic numbers or inline strings (see Constants section below)
10. **Reset capability** — all features must support admin session reset (see Reset Capability section)

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

## Constants

All client-side constants live in `client/src/constants/`. Never use magic numbers or hardcoded user-facing strings.

### `strings.ts` — User-facing text
- All UI text, labels, error messages, aria-labels
- Organized by component prefix: `APP_*`, `PIN_*`, `FORM_*`, `MANAGER_*`, etc.
- Dynamic strings use arrow functions: `PILE_COUNT: (current, total) => \`${current} of ${total}\``
- Also exports `ENVELOPE_TYPES` for form select options

### `config.ts` — Business rules and configuration
- `PIN_LENGTH` (8), `PIN_DISPLAY_MAX_LENGTH` (10)
- `ENVELOPE_TITLE_MAX_LENGTH` (100)
- `ENVELOPE_PILE_VISIBLE_COUNT` (3)
- `SWIPE_THRESHOLD_PX` (80), `FAST_SWIPE_VELOCITY` (0.5)

### `animation.ts` — Animation timing and physics
- Durations: `ANIMATION_DURATION_MS`, `ENVELOPE_FLAP_DURATION`, `CONTENT_REVEAL_*`
- Pile card visuals: `PILE_CARD_SCALE_REDUCTION`, `PILE_CARD_Y_OFFSET_PX`, etc.
- Spring physics: `SPRING_STIFFNESS`, `SPRING_DAMPING`, `TAP_SCALE`
- Haptics: `HAPTIC_TAP_DURATION_MS`, `HAPTIC_SUCCESS_PATTERN_MS`

**When to add a constant:**
- Value appears in multiple places
- Value represents a business rule or constraint
- Value might need tuning (animation timing, thresholds)
- User-facing text (always)

**When inline is OK:**
- Truly one-off values that are self-explanatory in context
- Standard/obvious values like `min="0"`

## Reset Capability

The admin UI includes a **Reset Session** button that returns the app to a fresh state. This is essential for testing and re-running the babymoon experience.

**When adding new features, include reset logic in `server/src/services/admin.ts`:**

```typescript
// In resetSession() function, add cleanup for your feature:
export async function resetSession(): Promise<ResetSessionResult> {
  const result = await db.$transaction(async (tx) => {
    // Existing resets...
    const votesDeleted = await tx.wyrVote.deleteMany({});
    const participantsDeleted = await tx.participant.deleteMany({ where: { role: 'guest' } });
    const envelopesReset = await tx.envelope.updateMany({ data: { status: 'sealed' } });

    // ADD YOUR FEATURE'S RESET HERE:
    // const myFeatureReset = await tx.myFeatureTable.deleteMany({});
    // OR: await tx.myFeatureTable.updateMany({ data: { status: 'initial' } });

    return { participantsDeleted, envelopesReset, votesDeleted /*, myFeatureCount */ };
  });
  return result;
}
```

**What to reset:**
- User-generated content (votes, letters, responses)
- Activity state (progress, completion status)
- Session-specific data (participant designations)

**What NOT to reset:**
- Admin-created content (prompts, questions, configuration)
- Envelope definitions (just reset status to 'sealed')

## Build Philosophy

Each phase results in a working, deployed checkpoint in production. New complexity is added only after the previous layer is confirmed working. When bugs occur, they are isolated to the most recently added layer.

## Lessons Learned

- **Prisma config:** The `package.json#prisma` key is deprecated (removed in Prisma 7). Use `server/prisma.config.ts` instead.
- **Module-level timers need `.unref()`:** Any `setInterval`/`setTimeout` at module scope in server code must call `.unref()` so Jest worker processes can exit cleanly. Without it, tests pass but Jest force-kills the worker and prints a warning about leaked handles.
