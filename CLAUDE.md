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
| Real-time | Socket.io (local) / Azure SignalR (production) |
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
- **Friend letters (`FriendLetter`, `FriendThankYouNote`)** — these are contributed by real friends and must never be deleted. Friend-letter envelopes should also keep their current status.

## Build Philosophy

Each phase results in a working, deployed checkpoint in production. New complexity is added only after the previous layer is confirmed working. When bugs occur, they are isolated to the most recently added layer.

## Lessons Learned

- **Prisma config:** The `package.json#prisma` key is deprecated (removed in Prisma 7). Use `server/prisma.config.ts` instead.
- **Module-level timers need `.unref()`:** Any `setInterval`/`setTimeout` at module scope in server code must call `.unref()` so Jest worker processes can exit cleanly. Without it, tests pass but Jest force-kills the worker and prints a warning about leaked handles.

### Real-time (Socket.io / SignalR)

- **Dual transport pattern:** Use Socket.io for local development (no external services needed), Azure SignalR for production. Abstract behind a `RealtimeAdapter` interface with `sendToGroup()`, `sendToUser()`, `joinGroup()`, `leaveGroup()`. See `server/src/services/realtime.ts`.
- **Clients must join groups explicitly:** With Socket.io, clients must call `connection.joinGroup(groupName)` to receive broadcasts. The server sends to groups, but clients aren't automatically members. Add join/leave in a `useEffect` when the activity mounts/unmounts.
- **Vite proxy needs `ws: true`:** For Socket.io to work through Vite's dev proxy, add `ws: true` to the proxy config for the `/socket.io` path.
- **Negotiate endpoint returns transport type:** The `/api/signalr/negotiate` endpoint returns `{ transport: 'socketio' | 'signalr', url, userId, accessToken? }` so the client knows which library to use.
- **Testing real-time locally:** Use two different browsers (Chrome + Firefox), not regular + private mode. Browser fingerprinting produces identical IDs for both modes on the same machine.

### Azure Blob Storage (Photo Uploads)

- **Resource provider must be registered:** The `Microsoft.Storage` provider is not registered by default on new Azure subscriptions. Run `az provider register --namespace Microsoft.Storage --wait` before creating a storage account, otherwise all `az storage` commands fail with `SubscriptionNotFound`.
- **CORS required for browser uploads:** The client uploads directly to Azure Blob Storage via SAS tokens (bypassing the Node.js server). The storage account must have a CORS rule allowing the app's origin (e.g., `http://localhost:5173` for dev). Without it, the preflight OPTIONS request fails. Set with: `az storage cors add --account-name <name> --services b --methods "PUT OPTIONS" --origins "<origin>" --allowed-headers "*" --exposed-headers "*" --max-age 3600`.
- **Public blob read access for thumbnails:** The app stores bare `blobUrl` values (no SAS token) in the database for displaying photos. The storage account must have `--allow-blob-public-access true` and the `photos` container must have `--public-access blob`. Without this, image `<img src>` tags get 409 "Public access is not permitted" errors.
- **Storage account name:** `bwwtstorage` in resource group `bwwt-rg`, region `centralus`. Container: `photos`.
- **Env vars:** `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` in `server/.env`. The SAS endpoint returns 503 if these are missing.

### Interaction Design

- **Match gesture direction to layout:** If options are arranged vertically (top/bottom), use vertical gestures or tap. Horizontal swipe for vertically-stacked options is unintuitive.
- **Prefer tap over swipe for selection:** Direct tap on the desired option is more intuitive than swipe gestures, especially when both options are visible. Swipe is better for navigation (next/previous) than selection.
- **Always include a completion screen:** Activities should show a warm "All done!" screen before returning to the main view. This gives users a moment to reflect and provides closure. Include contextual messaging (e.g., different text for matched vs. different choices).

### Reset Capability Gotchas

- **FK ordering matters:** Deletions must follow foreign key dependency order. Tables with FK references to `Participant` (letters, votes, photos) must be deleted *before* participants. Adding a new table with an `uploadedById` or `participantId` FK and forgetting to add it to `resetSession()` will cause FK constraint violations that crash the reset.
- **Update `ResetSessionResult` in both places:** The interface exists in `server/src/services/admin.ts` AND `shared/types/api.ts` (`ResetSessionResponse`). Both must be updated when adding new reset fields.
- **Photos are user-generated content:** Despite being stored in Azure Blob Storage, the database `Photo` records must be deleted during reset. The blob files themselves persist (Azure cleanup is separate), but the DB records must go to avoid orphaned FK references.

### React Hooks

- **Never use `useState` for cleanup logic:** `useState(() => { return () => cleanup() })` does NOT work as a cleanup function. The return value of the initializer is stored as state, not registered as a cleanup. Always use `useEffect` with a return function for unmount cleanup.
- **Pass current values to submit functions:** When a hook holds state (`myLetter`) that a component also holds locally (`content` in textarea), the hook's state may be stale if auto-save hasn't flushed. Thread the current value from the component through to the API call rather than reading from hook state. Pattern: `submit(content, photoUrl)` not `submit()` reading from internal state.
- **Capture values before async calls:** When using state values (like `myLetter.id`) to match results after an async API call, capture the value *before* the `await`. State may change between the call and the response.

### Database Transactions

- **Use Serializable isolation for count-then-create patterns:** The default `READ COMMITTED` isolation level allows two concurrent transactions to both read the same count and make conflicting decisions. Any pattern that does `count → decide → create` based on the count needs `{ isolationLevel: 'Serializable' }` to prevent duplicates.

### CSP and External Resources

- **CSP must allow all external resource origins:** When adding features that load external resources (Azure Blob images, CDN scripts, etc.), update the `helmet` CSP directives in `server/src/index.ts`. The `imgSrc` directive must include `https://*.blob.core.windows.net` for Azure-hosted photos to display.

### API Response Consistency

- **Always wrap response data to match client expectations:** If the client calls `apiFetch<{ photo: Photo }>()` and accesses `response.data.photo`, the server must send `successResponse({ photo })` not `successResponse(photo)`. Mismatches between wrapper shape and client destructuring cause silent `undefined` errors. Check both sides when adding new endpoints.
