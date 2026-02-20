---
phase: "06-trivia-activity"
plan: "01"
subsystem: "trivia-backend"
tags: ["prisma", "express", "zod", "trivia", "api", "database"]
dependencies:
  requires: ["01-03", "02-02", "03-02"]
  provides: ["trivia-api", "trivia-schema", "trivia-types", "trivia-reset"]
  affects: ["06-02", "06-03", "06-04"]
tech-stack:
  added: []
  patterns: ["content-library-with-join-table", "json-column-for-options"]
key-files:
  created:
    - "shared/types/trivia.ts"
    - "server/src/db/queries/trivia.ts"
    - "server/src/services/trivia.ts"
    - "server/src/routes/trivia.ts"
    - "server/prisma/migrations/20260219000000_add_trivia/migration.sql"
  modified:
    - "server/prisma/schema.prisma"
    - "shared/types/index.ts"
    - "shared/types/api.ts"
    - "server/src/services/admin.ts"
    - "server/src/index.ts"
    - "server/src/__tests__/services/admin.test.ts"
    - "server/src/__tests__/routes/admin.test.ts"
decisions:
  - id: "06-01-01"
    title: "JSON column for trivia options"
    choice: "Prisma Json type mapping to PostgreSQL jsonb"
    rationale: "Options are always fetched with their question, never independently. Avoids N+1 queries and extra join table complexity."
  - id: "06-01-02"
    title: "Content library with join table pattern"
    choice: "TriviaQuestion standalone + TriviaEnvelopeQuestion join table"
    rationale: "Unlike WYR prompts which belong directly to envelopes, trivia questions exist in a library and are assigned to envelopes. Enables reuse of questions across envelopes."
  - id: "06-01-03"
    title: "Admin routes use /admin/ prefix"
    choice: "Admin routes prefixed with /admin/ to avoid collision with :envelopeId param"
    rationale: "Express matches param routes greedily. Placing admin routes before param routes with distinct path prefix prevents /admin/questions from matching as envelopeId='admin'."
metrics:
  duration: "~10 min"
  completed: "2026-02-19"
---

# Phase 06 Plan 01: Trivia Backend Foundation Summary

Complete trivia backend with Prisma schema, migration, shared types/Zod schemas, typed query layer, business logic service, and Express routes at /api/trivia.

## Performance

- **Duration:** ~10 minutes
- **Tasks:** 2/2 completed
- **Tests:** All passing (161 client + 314 server)

## Accomplishments

1. **Prisma Schema** -- Added TriviaQuestion (with Json options), TriviaEnvelopeQuestion (join table with sort order), and TriviaAnswer models with proper relations to Envelope and Participant
2. **Migration** -- Created and applied migration SQL for three new tables with indexes, unique constraints, and FK constraints
3. **Shared Types** -- Full trivia API contract: TriviaQuestion, TriviaOption, TriviaPhase, TriviaEnvelopeResponse, TriviaAnswerRequest/Response, plus five Zod validation schemas
4. **Query Layer** -- Typed Prisma query functions for question CRUD, envelope assignment, answer recording, and counting
5. **Service Layer** -- Solo trivia business logic: getEnvelopeState builds per-question state with answers, submitAnswer validates correctness and marks envelope complete
6. **Routes** -- Guest endpoints (GET state, POST answer) and admin endpoints (CRUD questions, assign/reorder on envelopes)
7. **Admin Reset** -- TriviaAnswer deletion added before participant deletion in reset transaction; questions and assignments preserved as admin content
8. **Router Wiring** -- triviaRouter mounted at /api/trivia in server index

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Prisma schema, migration, shared types | 85a72c8 | schema.prisma, trivia.ts (shared), api.ts, index.ts (shared), migration.sql |
| 2 | Query layer, service, routes, reset, router wiring | c1b8a40 | trivia.ts (queries), trivia.ts (service), trivia.ts (routes), admin.ts, index.ts (server) |

## Files Created

- `shared/types/trivia.ts` -- Type definitions and Zod validation schemas
- `server/src/db/queries/trivia.ts` -- Typed Prisma query functions
- `server/src/services/trivia.ts` -- Business logic (getEnvelopeState, submitAnswer)
- `server/src/routes/trivia.ts` -- Express routes for guest and admin endpoints
- `server/prisma/migrations/20260219000000_add_trivia/migration.sql` -- Database migration

## Files Modified

- `server/prisma/schema.prisma` -- Three new models + relations on Envelope and Participant
- `shared/types/index.ts` -- Re-exports for trivia types and Zod schemas
- `shared/types/api.ts` -- triviaAnswersDeleted added to ResetSessionResponse
- `server/src/services/admin.ts` -- Trivia answer deletion in reset transaction
- `server/src/index.ts` -- triviaRouter import and mount
- `server/src/__tests__/services/admin.test.ts` -- TriviaAnswer mock added
- `server/src/__tests__/routes/admin.test.ts` -- TriviaAnswer mock added

## Decisions Made

1. **JSON column for options** -- Used Prisma `Json` type (PostgreSQL `jsonb`) for trivia question options. Cast through `unknown` to `TriviaOption[]` in the `toApiQuestion` transform. Zod validates the shape on write.
2. **Content library pattern** -- TriviaQuestion is standalone (no envelopeId). TriviaEnvelopeQuestion join table connects questions to envelopes with sortOrder. This differs from WYR where prompts belong directly to envelopes.
3. **Admin route prefix** -- All admin endpoints use `/admin/` prefix (e.g., `/admin/questions`, `/admin/envelope/:envelopeId/questions`) placed before param routes to prevent Express from matching `admin` as an envelopeId.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma Json type cast requires double-cast through unknown**

- **Found during:** Task 2 (server compilation)
- **Issue:** TypeScript strict mode rejects direct cast from `Prisma.JsonValue` to `TriviaOption[]` because the types don't sufficiently overlap
- **Fix:** Used `question.options as unknown as TriviaOption[]` pattern
- **Files modified:** `server/src/db/queries/trivia.ts`
- **Commit:** c1b8a40

**2. [Rule 1 - Bug] Unused import in routes file**

- **Found during:** Task 2 (lint pre-commit hook)
- **Issue:** `getQuestionById` was imported in routes but not used (lookup happens in service layer)
- **Fix:** Removed unused import
- **Files modified:** `server/src/routes/trivia.ts`
- **Commit:** c1b8a40

**3. [Rule 3 - Blocking] Duplicate Prisma migration from timed-out --create-only**

- **Found during:** Task 1 (migration)
- **Issue:** `prisma migrate dev --create-only` appeared to hang on Windows but actually created a second migration directory. This conflicted with the manually-created migration.
- **Fix:** Removed duplicate migration, resolved DB migration state with `prisma migrate resolve --rolled-back`
- **Files modified:** None (cleanup only)
- **Commit:** N/A (resolved before Task 1 commit)

## Issues Encountered

- **Prisma migrate dev hangs on Windows with remote DB** -- The `prisma migrate dev --create-only` command did not return output within timeout when connecting to Azure PostgreSQL. Workaround: create migration SQL manually + use `prisma migrate deploy`.

## Next Phase Readiness

**Ready for 06-02 (Client UI Components):**
- All trivia types exported from `shared` and available for import
- API endpoints documented and working
- Service layer returns TriviaEnvelopeResponse and TriviaAnswerResponse matching client expectations
- No blockers for UI implementation
