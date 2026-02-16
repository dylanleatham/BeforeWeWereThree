# Phase 5: Baby Name Game & AI - Research

**Researched:** 2026-02-15
**Domain:** AI integration (Anthropic API), real-time collaborative voting, multi-round state management
**Confidence:** HIGH

## Summary

Phase 5 adds the AI-powered Baby Name Game, where Claude generates batches of baby names with origin, meaning, and notes. Both partners independently vote Love/Maybe/Nope on each name via a Tinder-style swipe card interface, then see results with matches highlighted. The activity supports multiple rounds with free-text AI guidance, and previously shown/declined names never repeat across rounds. Matches accumulate across all rounds.

The implementation follows the established WYR (Would You Rather) pattern almost exactly: independent voting, waiting phase, shared reveal. The key additions are: (1) server-side Anthropic API integration for name generation, (2) a swipe-based card UI (compared to WYR's tap-based voting), (3) multi-round flow with exclusion tracking, and (4) the activity never "completes" (unlike WYR envelopes).

**Primary recommendation:** Follow the WYR service/route/query/hook/types pattern exactly. Add `@anthropic-ai/sdk` to the server, use structured outputs (`output_config.format` with JSON schema) for guaranteed valid responses, and store rounds/names/votes in new Prisma models that mirror the WYR pattern.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.74.x | Anthropic Claude API | Official TypeScript SDK. Supports structured outputs via `output_config.format` with Zod schema integration via `zodOutputFormat` helper. Already planned in STACK.md. |
| `motion` (motion/react) | ^12.30.0 | Card swipe animations | Already in client. Used for all animation in the app (envelope flap, pile cards, WYR reveal). Will power card exit animations on swipe. |
| `@use-gesture/react` | ^10.3.1 | Swipe gesture detection | Already in client. Used for `useSwipeNavigation`. Will be used for Love/Maybe/Nope swipe detection with directional thresholds. |
| `zod` | ^4.3.6 | Request/response validation | Already in shared package. Used for all API validation. Will define name game schemas in `shared/types/nameGame.ts`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `socket.io` / `@microsoft/signalr` | Already installed | Real-time sync | For broadcasting vote completion and all-done events between partners. Same pattern as WYR's `wyrVoteSubmitted`/`wyrRevealReady`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Structured outputs (`output_config.format`) | Tool use with `strict: true` | Tool use is overkill here -- we just want JSON response, not function calling. Structured outputs are simpler and purpose-built for this use case. |
| Raw JSON parsing of Claude response | `output_config.format` with JSON schema | Raw parsing requires retry logic for malformed JSON. Structured outputs guarantee schema compliance via constrained decoding. No retries needed. |
| Claude Haiku for cost savings | Claude Sonnet 4.5 | Haiku is cheaper but may produce lower quality name notes. Sonnet 4.5 supports structured outputs and provides better creative output. Model choice should be configurable via env var. |

### Installation

```bash
# Server only -- client already has all needed packages
cd server && npm install @anthropic-ai/sdk
```

## Architecture Patterns

### Recommended Project Structure

New files follow the exact patterns from WYR:

```
server/src/
  services/nameGame.ts          # Business logic (matches wyr.ts pattern)
  routes/nameGame.ts             # Express routes (matches routes/wyr.ts)
  db/queries/nameGame.ts         # Prisma query functions (matches db/queries/wyr.ts)
  services/anthropic.ts          # Anthropic API wrapper (new, isolated)

client/src/
  hooks/useNameGame.ts           # State management hook (matches useWouldYouRather.ts)
  components/activities/NameGame/
    NameGameActivity.tsx          # Main orchestrator (matches WouldYouRatherActivity.tsx)
    VotingPhase.tsx               # Swipe card interface (new, Tinder-style)
    WaitingPhase.tsx              # Waiting for partner (reuse WYR pattern)
    ResultsPhase.tsx              # Results with matches/near-misses
    NewRoundPhase.tsx             # AI guidance input for next round
    NameCard.tsx                  # Individual name card component
    index.ts                     # Re-exports

shared/types/
  nameGame.ts                    # All types, Zod schemas, SignalR message types

server/prisma/
  migrations/NNNN_add_name_game/ # Schema migration
```

### Pattern 1: WYR-Mirrored Service Architecture

**What:** Every layer (types, queries, service, route, hook, component) mirrors the WYR implementation exactly.
**When to use:** For all name game server and client code.
**Why:** The WYR pattern is proven, tested, and follows all project conventions. The name game has the same fundamental flow: independent action -> waiting -> shared reveal.

```typescript
// shared/types/nameGame.ts - Follows shared/types/wyr.ts pattern exactly
import { z } from 'zod';

export type NameVoteChoice = 'love' | 'maybe' | 'nope';

export interface GeneratedName {
  id: string;          // DB-assigned UUID
  roundId: string;
  name: string;
  origin: string[];    // Array per prompt contract
  meaning: string;
  notes: string;
  sortOrder: number;
}

export interface NameVoteState {
  name: GeneratedName;
  myVote: NameVoteChoice | null;
  partnerVoted: boolean;
}

export interface NameGameRoundResponse {
  roundId: string;
  roundNumber: number;
  names: NameVoteState[];
  allVoted: boolean;    // Both partners finished voting
}

export interface NameGameResults {
  matches: GeneratedName[];       // Both loved
  nearMisses: GeneratedName[];    // One loved + one maybe
  worthDiscussing: GeneratedName[]; // Both said maybe
  myVotes: Record<string, NameVoteChoice>;
  partnerVotes: Record<string, NameVoteChoice>;
}

// Accumulated matches across all rounds
export interface NameGameMatchList {
  matches: GeneratedName[];
}

// SignalR messages
export interface NameVoteSubmittedMessage {
  type: 'name_vote_submitted';
  roundId: string;
  participantId: string;
  namesVotedCount: number;  // Progress indicator
  totalNames: number;
}

export interface NameRoundCompleteMessage {
  type: 'name_round_complete';
  roundId: string;
  results: NameGameResults;
}
```

### Pattern 2: Anthropic API Service (Isolated)

**What:** A dedicated service that wraps the Anthropic SDK, handles prompt composition, and returns typed results.
**When to use:** Only from `services/nameGame.ts`, never from routes directly.
**Why:** Isolates AI complexity from business logic. Makes testing easy (mock the service).

```typescript
// server/src/services/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Schema matching the locked prompt contract from feature blueprint section 10.4
const nameResponseSchema = z.object({
  names: z.array(z.object({
    name: z.string(),
    origin: z.array(z.string()),
    meaning: z.string(),
    notes: z.string(),
  })),
});

export type AINameResponse = z.infer<typeof nameResponseSchema>;

interface GenerateNamesParams {
  count: number;
  excludeNames: string[];        // Names already shown in any round
  userGuidance?: string;         // Free-text from user for subsequent rounds
}

export async function generateNames(params: GenerateNamesParams): Promise<AINameResponse> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(params);

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            names: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  origin: { type: 'array', items: { type: 'string' } },
                  meaning: { type: 'string' },
                  notes: { type: 'string' },
                },
                required: ['name', 'origin', 'meaning', 'notes'],
                additionalProperties: false,
              },
            },
          },
          required: ['names'],
          additionalProperties: false,
        },
      },
    },
  });

  // Structured outputs guarantee valid JSON in response.content[0].text
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return nameResponseSchema.parse(JSON.parse(text));
}
```

### Pattern 3: Multi-Round State with Exclusion Tracking

**What:** Database tracks rounds, names within rounds, and votes. Exclusion list is computed from all previous rounds' names.
**When to use:** For every name generation request.
**Why:** The AI is stateless (per prompt contract section 10.3C). The app must provide the full exclusion list on every request.

```
Database Model:
  NameGameRound (envelope_id, round_number, guidance_text, created_at)
    -> NameGameName (round_id, name, origin[], meaning, notes, sort_order)
      -> NameGameVote (name_id, participant_id, choice: love|maybe|nope)
```

### Pattern 4: Swipe Card with useDrag + motion.div

**What:** Wrapper div captures gesture with `useDrag`, inner `motion.div` animates based on drag state.
**When to use:** For the name card voting UI.
**Why:** This is the established pattern from CLAUDE.md: "useDrag + motion.div pattern: wrapper div for gesture, inner motion.div for animation."

```typescript
// Directional swipe detection
// Right = Love, Left = Nope, Down = Maybe
const bind = useDrag(
  ({ active, movement: [mx, my], direction: [dx, dy], velocity: [vx, vy], cancel }) => {
    if (active) {
      // Update visual feedback (tilt, color overlay)
      setDragState({ x: mx, y: my });
    } else {
      // Determine vote based on gesture direction
      const isHorizontal = Math.abs(mx) > Math.abs(my);
      const passedThreshold = isHorizontal
        ? Math.abs(mx) > SWIPE_THRESHOLD_PX
        : Math.abs(my) > SWIPE_THRESHOLD_PX;
      const fastSwipe = isHorizontal
        ? Math.abs(vx) > FAST_SWIPE_VELOCITY
        : Math.abs(vy) > FAST_SWIPE_VELOCITY;

      if (passedThreshold || fastSwipe) {
        if (isHorizontal && dx > 0) onVote('love');
        else if (isHorizontal && dx < 0) onVote('nope');
        else if (!isHorizontal && dy > 0) onVote('maybe');
      }
      setDragState({ x: 0, y: 0 }); // Spring back
    }
  },
  { filterTaps: true }
);
```

### Pattern 5: Activity Never "Completes" Envelope

**What:** Unlike WYR, the name game envelope stays "opened" and never transitions to "completed". Users can always start new rounds.
**When to use:** For envelope status management.
**Why:** Per CONTEXT.md: "Activity never 'completes' -- always available for more rounds."

The `handleActivityComplete` callback from BaseEnvelope will not be called after a round. The close button returns to the envelope pile without changing status.

### Anti-Patterns to Avoid

- **Storing AI prompt in client code:** The system prompt and composition model must live server-side only. Client sends only the user's free-text guidance.
- **Calling Anthropic API from routes directly:** Always go through the `anthropic.ts` service. This isolates API concerns and makes mocking trivial.
- **Relying on AI to track exclusions:** The AI is stateless. The server must compute the full exclusion list from the database and pass it in every request.
- **Using `any` for Anthropic response types:** Use structured outputs + Zod parsing for end-to-end type safety.
- **Blocking UI while AI generates:** Name generation can take 2-5 seconds. Show a loading state, not a frozen screen.
- **Making the envelope status "completed":** This activity never completes. Always allow new rounds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON response parsing from AI | Custom JSON parser with error handling | `output_config.format` structured outputs | Guaranteed valid JSON via constrained decoding. Zero parsing failures. |
| Swipe gesture detection | Custom touch event handling | `@use-gesture/react` useDrag | Handles velocity, direction, threshold, axis locking, and tap filtering. Battle-tested library already in the project. |
| Card exit animations | CSS transitions | `motion/react` AnimatePresence + motion.div | Handles unmount animations, gesture-driven transforms, spring physics. Already used throughout. |
| Real-time sync between partners | Custom polling or WebSocket code | Existing SignalR/Socket.io infrastructure via `useSignalREvent` | Proven pattern from WYR. Just define new event names. |
| Name deduplication across rounds | In-memory tracking | Database query: `SELECT DISTINCT name FROM name_game_names WHERE round_id IN (SELECT id FROM name_game_rounds WHERE envelope_id = ?)` | Persistence survives page refreshes and server restarts. |

**Key insight:** The hardest part of this phase is NOT the AI integration (structured outputs makes that straightforward). It's the multi-round state management with accumulating matches and exclusion tracking. The database is the source of truth, not client state.

## Common Pitfalls

### Pitfall 1: AI Response Latency Blocking UX
**What goes wrong:** User clicks "Start Round" and stares at a frozen screen for 3-5 seconds while Claude generates names.
**Why it happens:** Anthropic API calls take 2-5 seconds. No loading state implemented.
**How to avoid:** Show an engaging loading state immediately when generation starts. Use a dedicated "Generating names..." screen with animation. The API call happens server-side, client polls or receives a SignalR event when ready.
**Warning signs:** No loading component in the VotingPhase design.

### Pitfall 2: Exclusion List Growing Unbounded
**What goes wrong:** After many rounds, the exclusion list passed to Claude becomes enormous, consuming tokens and potentially degrading response quality.
**Why it happens:** Every name ever shown across all rounds is excluded.
**How to avoid:** Pass only name strings (not full objects) in the exclusion list. Set a reasonable prompt token budget. If the list grows very large (50+ names), consider summarizing rather than listing every name. In practice, 5-10 rounds of 10 names = 50-100 names, which is manageable.
**Warning signs:** Anthropic API calls getting slower or returning fewer names than requested.

### Pitfall 3: Race Condition on Simultaneous Vote Submission
**What goes wrong:** Both partners finish voting at the same moment, triggering two "round complete" events.
**Why it happens:** Default READ COMMITTED isolation doesn't prevent the count-then-decide pattern.
**How to avoid:** Use Serializable isolation in the transaction that checks vote completion, exactly as WYR does: `db.$transaction(async (tx) => { ... }, { isolationLevel: 'Serializable' })`.
**Warning signs:** Duplicate results broadcasts, UI showing results twice.

### Pitfall 4: Forgetting to Add Reset Logic
**What goes wrong:** Admin reset doesn't clear name game data, causing FK constraint violations when clearing participants.
**Why it happens:** New tables (NameGameVote, NameGameName, NameGameRound) have FK references to Participant.
**How to avoid:** Add deletion in the correct FK order in `server/src/services/admin.ts`: votes first, then names, then rounds, then (existing) participants. Update `ResetSessionResult` in both `admin.ts` and `shared/types/api.ts`.
**Warning signs:** Reset button crashes with FK constraint error.

### Pitfall 5: Not Shuffling Names Per Partner
**What goes wrong:** Both partners see names in the same order, potentially influencing each other's voting patterns.
**Why it happens:** Names are returned in sort_order from the database.
**How to avoid:** The server returns names in sort_order (consistent for all queries). The **client** shuffles the order using a deterministic seed based on participant ID. This ensures each partner sees a different order but the order is stable across page refreshes for the same user.
**Warning signs:** Both devices showing identical card order during testing.

### Pitfall 6: ANTHROPIC_API_KEY Not Configured
**What goes wrong:** Name generation fails with a cryptic error in production.
**Why it happens:** The env var isn't set or the Key Vault reference is misconfigured.
**How to avoid:** Validate `ANTHROPIC_API_KEY` at server startup (or at least before first use). Return a clear error code (`SERVICE_UNAVAILABLE`) with a helpful message. Add to `.env.example`. The technical patterns doc shows it should be stored in Key Vault as `anthropic-api-key`.
**Warning signs:** 500 errors on the generate names endpoint.

### Pitfall 7: Structured Outputs First-Request Latency
**What goes wrong:** The very first name generation request is significantly slower (extra seconds).
**Why it happens:** Anthropic compiles the JSON schema into a grammar on first use. Subsequent requests use the cached grammar (24h cache).
**How to avoid:** Accept this as expected behavior. The loading state handles it gracefully. Optionally, make a "warmup" call at server startup (but this costs tokens, so probably not worth it for a 2-user app).
**Warning signs:** First round takes noticeably longer than subsequent rounds.

## Code Examples

### Database Migration (Prisma Schema Addition)

```prisma
// Add to server/prisma/schema.prisma

// Name Game round - one round per button press
model NameGameRound {
  id         String   @id @default(uuid())
  envelopeId String   @map("envelope_id")
  roundNumber Int     @map("round_number")
  guidance   String?  // User's free-text guidance for AI (null for first round)
  createdAt  DateTime @default(now()) @map("created_at")

  envelope Envelope        @relation(fields: [envelopeId], references: [id], onDelete: Cascade)
  names    NameGameName[]

  @@unique([envelopeId, roundNumber])
  @@index([envelopeId])
  @@map("name_game_rounds")
}

// Individual generated name within a round
model NameGameName {
  id        String   @id @default(uuid())
  roundId   String   @map("round_id")
  name      String
  origin    String[] // PostgreSQL text array
  meaning   String
  notes     String
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  round NameGameRound  @relation(fields: [roundId], references: [id], onDelete: Cascade)
  votes NameGameVote[]

  @@index([roundId])
  @@map("name_game_names")
}

// Vote on a name by a participant
model NameGameVote {
  id            String   @id @default(uuid())
  nameId        String   @map("name_id")
  participantId String   @map("participant_id")
  choice        String   // 'love', 'maybe', or 'nope'
  createdAt     DateTime @default(now()) @map("created_at")

  name        NameGameName @relation(fields: [nameId], references: [id], onDelete: Cascade)
  participant Participant  @relation(fields: [participantId], references: [id])

  @@unique([nameId, participantId])
  @@index([participantId])
  @@map("name_game_votes")
}
```

**Note:** The Envelope model needs a new relation added:
```prisma
model Envelope {
  // ... existing fields ...
  nameGameRounds NameGameRound[]
}
```

And the Participant model needs a new relation:
```prisma
model Participant {
  // ... existing fields ...
  nameGameVotes NameGameVote[]
}
```

### Reset Logic Addition

```typescript
// In server/src/services/admin.ts resetSession()
// Add BEFORE participant deletion (FK ordering):

// Delete name game votes (FK to participants and names)
const nameVotesDeleted = await tx.nameGameVote.deleteMany({});

// Delete name game names (FK to rounds)
const nameNamesDeleted = await tx.nameGameName.deleteMany({});

// Delete name game rounds (FK to envelopes)
const nameRoundsDeleted = await tx.nameGameRound.deleteMany({});

// ... existing participant deletion follows ...
```

### API Endpoint Pattern

```typescript
// server/src/routes/nameGame.ts - follows routes/wyr.ts pattern
// Key endpoints:

// GET /api/name-game/:envelopeId
//   Returns: current round state, all rounds' results, accumulated matches
//   Auth: authMiddleware

// POST /api/name-game/:envelopeId/generate
//   Body: { guidance?: string }
//   Returns: new round with generated names
//   Auth: authMiddleware
//   Notes: Calls Anthropic API, creates round + names in DB

// POST /api/name-game/:nameId/vote
//   Body: { choice: 'love' | 'maybe' | 'nope' }
//   Returns: { allVoted: boolean, results?: NameGameResults }
//   Auth: authMiddleware
//   Notes: Uses Serializable transaction, broadcasts via SignalR

// GET /api/name-game/:envelopeId/matches
//   Returns: accumulated matches across all rounds
//   Auth: authMiddleware
```

### Client Hook Pattern

```typescript
// client/src/hooks/useNameGame.ts - follows useWouldYouRather.ts pattern
// Key state:
//   phase: 'loading' | 'voting' | 'waiting' | 'results' | 'new-round' | 'generating'
//   currentRound: NameGameRoundResponse | null
//   currentNameIndex: number
//   allMatches: GeneratedName[]
//   results: NameGameResults | null
//
// SignalR events subscribed:
//   'nameVoteSubmitted' -> update partner progress
//   'nameRoundComplete' -> transition to results phase
//
// Key actions:
//   startRound(guidance?) -> POST generate, set phase to 'generating' then 'voting'
//   vote(choice) -> POST vote, optimistic update, advance to next name
//   startNewRound() -> set phase to 'new-round' (shows guidance input)
```

### Prompt Composition (Following Locked Contract)

```typescript
// server/src/services/anthropic.ts

function buildSystemPrompt(): string {
  return `You are a neutral baby name ideation assistant. Your role is to broaden name exploration while respecting participant decisions.

Rules:
- No ranking, scoring, or prioritization of names
- No persuasive or opinionated language
- Neutral, factual tone
- Names are presented as discussion starters only
- Common, rare, traditional, modern, and pop-culture-adjacent names are all allowed
- No filtering based on popularity, trendiness, or media presence
- If origin or meaning is debated or uncertain, respond conservatively
- Return fewer names rather than violating constraints
- Do not include apologies, explanations, or meta-commentary`;
}

function buildUserPrompt(params: GenerateNamesParams): string {
  const parts: string[] = [];

  // Base context (fixed for this app)
  parts.push('Generate baby names with diverse cultural origins. Names should function comfortably across cultures. Provide concise, factual notes about each name including observations about sound, feel, or cross-cultural usability.');

  // Count
  parts.push(`Generate exactly ${params.count} names.`);

  // Exclusion list (session state)
  if (params.excludeNames.length > 0) {
    parts.push(`Do NOT include any of these names (already shown): ${params.excludeNames.join(', ')}`);
  }

  // User guidance (round tweaks)
  if (params.userGuidance) {
    parts.push(`Additional guidance for this round: ${params.userGuidance}`);
  }

  return parts.join('\n\n');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prompting for JSON + manual parsing + retries | Structured outputs (`output_config.format`) | Nov 2025 GA | Guaranteed valid JSON. No parsing errors. No retry logic needed. |
| `output_format` parameter (beta) | `output_config.format` parameter (GA) | Late 2025 | Old parameter deprecated but still works. Use new `output_config.format`. |
| Beta header `structured-outputs-2025-11-13` | No header needed (GA) | Late 2025 | Beta headers no longer required for structured outputs. |
| Asking Claude for JSON in prompt text | Using `type: "json_schema"` with strict schema | Nov 2025 | Schema compiled to grammar, constrained token generation. Format guaranteed. |

**Deprecated/outdated:**
- `output_format` parameter: Deprecated, moved to `output_config.format`. Still works temporarily.
- Beta headers for structured outputs: No longer required since GA release.

## Open Questions

1. **Which Claude model to use for name generation?**
   - What we know: The app is for 2 users, cost is not a major concern. Structured outputs are supported on Claude Opus 4.6, Sonnet 4.5, Opus 4.5, and Haiku 4.5.
   - What's unclear: Whether Haiku produces sufficiently creative/diverse name notes compared to Sonnet.
   - Recommendation: Default to `claude-sonnet-4-5-20250929` and make configurable via `ANTHROPIC_MODEL` env var. Sonnet is the sweet spot of quality and cost.

2. **Should name generation be synchronous or asynchronous?**
   - What we know: Anthropic API calls take 2-5 seconds. The current WYR pattern is synchronous (API call in request handler, response returned).
   - What's unclear: Whether 2-5 second API response time is acceptable for a POST endpoint.
   - Recommendation: Keep it synchronous like WYR. The client shows a loading/generating state. For a 2-user app, there's no need for async job queues. The structured outputs first-request compilation adds extra latency only once.

3. **Client-side shuffle: deterministic or random?**
   - What we know: Each partner should see names in different order (per CONTEXT.md). Order should be stable across page refreshes.
   - What's unclear: Whether a simple Fisher-Yates shuffle with participant ID as seed is sufficient.
   - Recommendation: Use a seeded shuffle (participant ID hashed to seed). Simple, deterministic, different per user.

## Sources

### Primary (HIGH confidence)
- [Anthropic Structured Outputs Documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - Full API reference for `output_config.format`, JSON schema support, TypeScript examples with Zod integration
- [@anthropic-ai/sdk GitHub](https://github.com/anthropics/anthropic-sdk-typescript) - Official SDK, current version ~0.74.x, supports structured outputs GA
- Codebase: `server/src/services/wyr.ts` - Proven service pattern with transaction handling, SignalR broadcasting
- Codebase: `client/src/hooks/useWouldYouRather.ts` - Proven hook pattern with phase state machine, SignalR event subscriptions
- Codebase: `shared/types/wyr.ts` - Proven shared types pattern with Zod schemas
- Codebase: `docs/babymoon_portal_feature_blueprint.md` Section 10 - Locked AI prompt contract

### Secondary (MEDIUM confidence)
- [Anthropic TypeScript SDK npm](https://www.npmjs.com/package/@anthropic-ai/sdk) - Version 0.74.0 current, verified via web search
- `.planning/research/STACK.md` - Prior research recommends `@anthropic-ai/sdk ^0.71.x` (slightly outdated version, current is 0.74.x)

### Tertiary (LOW confidence)
- First-request latency for structured outputs (mentioned in official docs but no specific benchmarks for name generation use case)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Only one new dependency (`@anthropic-ai/sdk`), everything else already in project. Structured outputs API verified from official docs.
- Architecture: HIGH - Directly mirrors proven WYR pattern with well-understood additions. All patterns verified against existing codebase.
- Pitfalls: HIGH - Most pitfalls are variants of known issues from WYR (race conditions, FK ordering, reset logic). AI-specific pitfalls verified from official Anthropic documentation.

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable domain, Anthropic SDK follows SemVer for breaking changes)
