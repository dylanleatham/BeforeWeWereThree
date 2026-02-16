---
phase: 05-baby-name-game-ai
plan: 01
subsystem: database, api, ai
tags: [prisma, anthropic, structured-outputs, zod, typescript, postgresql]

# Dependency graph
requires:
  - phase: 01-03
    provides: Prisma schema with Envelope and Participant models
  - phase: 03-02
    provides: WYR pattern for voting, types, and service architecture
provides:
  - NameGameRound, NameGameName, NameGameVote Prisma models
  - Shared TypeScript types for name game API contract
  - Anthropic API service with structured outputs for name generation
  - Zod validation schemas for name game requests
affects: [05-02, 05-03, 05-04, 05-05]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk ^0.74.0"]
  patterns: ["Structured outputs via output_config.format with json_schema", "Isolated AI service wrapper pattern"]

key-files:
  created:
    - server/prisma/migrations/20260216022800_add_name_game/migration.sql
    - shared/types/nameGame.ts
    - server/src/services/anthropic.ts
  modified:
    - server/prisma/schema.prisma
    - shared/types/index.ts
    - server/package.json

key-decisions:
  - "Used prisma db push instead of migrate dev due to migration history drift on Azure"
  - "Anthropic structured outputs (output_config.format) for guaranteed valid JSON - no retry logic needed"
  - "Default model claude-sonnet-4-5-20250929 configurable via ANTHROPIC_MODEL env var"

patterns-established:
  - "Anthropic service isolation: AI wrapper in dedicated service, never called from routes directly"
  - "Structured outputs with json_schema type for constrained JSON generation"
  - "Name game models follow WYR FK pattern: cascade delete from parent, restrict on Participant"

# Metrics
duration: 6min
completed: 2026-02-15
---

# Phase 5 Plan 1: Name Game Foundation Summary

**Prisma schema with NameGameRound/Name/Vote models, shared TypeScript types with Zod validation, and Anthropic API service using structured outputs for AI name generation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-16T02:27:51Z
- **Completed:** 2026-02-16T02:33:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Three new Prisma models (NameGameRound, NameGameName, NameGameVote) with proper FK relations, indexes, and unique constraints
- Complete shared TypeScript types defining the name game API contract (GeneratedName, NameVoteState, NameGameRoundResponse, NameGameResults, etc.)
- Anthropic API service with structured outputs following the locked prompt contract from Section 10 of the feature blueprint
- Zod validation schemas for generate names and submit vote requests

## Task Commits

Each task was committed atomically:

1. **Task 1: Database schema and migration** - `a870fad` (feat)
2. **Task 2: Shared types and Anthropic API service** - `d1e0842` (feat)

## Files Created/Modified
- `server/prisma/schema.prisma` - Added NameGameRound, NameGameName, NameGameVote models with Envelope and Participant relations
- `server/prisma/migrations/20260216022800_add_name_game/migration.sql` - SQL migration for three new tables with indexes and constraints
- `shared/types/nameGame.ts` - All name game types, Zod schemas, and SignalR message types
- `shared/types/index.ts` - Added name game type exports
- `server/src/services/anthropic.ts` - Anthropic API wrapper with structured outputs for name generation
- `server/package.json` - Added @anthropic-ai/sdk dependency

## Decisions Made
- **prisma db push instead of migrate dev:** Migration history had drifted from the Azure database (tables added without recorded migrations). Used `db push` to sync schema directly, then created migration SQL manually for reference.
- **Structured outputs (output_config.format):** Used the GA `json_schema` format type for constrained JSON generation. No beta headers needed. Guarantees valid JSON via constrained decoding, eliminating retry logic.
- **Default model:** `claude-sonnet-4-5-20250929` as default, configurable via `ANTHROPIC_MODEL` env var. Sweet spot of quality and cost for a 2-user app.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Prisma migration history drift:** `prisma migrate dev` refused to create migration because existing tables weren't tracked in migration history. Resolved by using `prisma db push` to sync the database, then manually creating the migration SQL file for documentation purposes.
- **Windows Prisma EPERM errors:** File lock on `query_engine-windows.dll.node` during `prisma generate`. Resolved by deleting both `node_modules/.prisma` and `server/node_modules/.prisma` before generating (known Windows issue documented in CLAUDE.md).

## User Setup Required

**External services require manual configuration.** The Anthropic API key must be configured:

1. Get an API key from the [Anthropic Console](https://console.anthropic.com) -> API Keys -> Create key
2. Add to `server/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL=claude-sonnet-4-5-20250929  # Optional, this is the default
   ```
3. Verify: The name generation endpoint will throw a clear error if the key is missing.

## Next Phase Readiness
- Database models ready for query functions (05-02)
- Shared types ready for route handlers and client hooks (05-02, 05-03)
- Anthropic service ready to be called from nameGame service (05-02)
- All 217 existing tests still pass (92 client + 125 server)

---
*Phase: 05-baby-name-game-ai*
*Completed: 2026-02-15*
