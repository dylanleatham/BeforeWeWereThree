---
phase: 03-real-time-sync-would-you-rather
plan: 02
subsystem: backend-api
tags: [wyr, prisma, express, signalr, zod]

dependency-graph:
  requires:
    - phase: 01
      artifact: "Database schema and Prisma setup"
    - phase: 02
      artifact: "Envelope data model"
    - phase: 03-01
      artifact: "SignalR service infrastructure"
  provides:
    - "WYR Prisma models (WyrPrompt, WyrVote)"
    - "WYR shared TypeScript types and Zod schemas"
    - "WYR database query functions"
    - "WYR business logic service with SignalR integration"
    - "WYR REST API endpoints"
  affects:
    - phase: 03-03
      reason: "Client WYR hook will call these APIs"
    - phase: 03-04
      reason: "WYR UI components will use these types"

tech-stack:
  added:
    - none
  patterns:
    - "Prisma transaction for vote race condition safety"
    - "Service layer with SignalR integration"
    - "Typed query functions per CLAUDE.md"

key-files:
  created:
    - shared/types/wyr.ts
    - server/src/db/queries/wyr.ts
    - server/src/services/wyr.ts
    - server/src/routes/wyr.ts
  modified:
    - server/prisma/schema.prisma
    - shared/types/index.ts
    - server/src/index.ts

decisions:
  - id: "wyr-vote-transaction"
    choice: "Prisma $transaction for vote submission"
    rationale: "Prevents race conditions when both participants vote simultaneously"
  - id: "wyr-signalr-groups"
    choice: "Use activity:envelopeId as SignalR group name"
    rationale: "Groups by envelope for activity-specific messaging"
  - id: "wyr-reveal-on-both-votes"
    choice: "Reveal triggered when vote count >= 2"
    rationale: "Simple count check after transaction ensures both votes are in"

metrics:
  duration: "~43 min"
  completed: "2026-02-06"
---

# Phase 03 Plan 02: WYR Data Model & API Summary

**One-liner:** WYR backend with Prisma models, typed queries, transactional voting, SignalR integration, and REST API.

## What Was Built

### Database Schema (server/prisma/schema.prisma)

**WyrPrompt model:**
- One-to-one with Envelope via unique envelopeId
- Stores optionA and optionB text
- Cascades delete when envelope deleted

**WyrVote model:**
- Composite unique constraint on (promptId, participantId)
- Choice stored as string ('option_a' | 'option_b')
- Relations to WyrPrompt and Participant

### Shared Types (shared/types/wyr.ts)

**Type definitions:**
- `WYRChoice`: 'option_a' | 'option_b'
- `WYRPhase`: 'voting' | 'waiting' | 'revealing' | 'complete'
- `WYRPrompt`, `WYRResults`, `WYRState` interfaces
- API request/response types

**SignalR message types:**
- `WYRVoteSubmittedMessage` - notifies when a vote is submitted
- `WYRRevealReadyMessage` - notifies when both have voted

**Zod schemas:**
- `wyrChoiceSchema`, `wyrVoteRequestSchema`
- `createWyrPromptSchema`, `updateWyrPromptSchema`

### Database Queries (server/src/db/queries/wyr.ts)

**Prompt queries:**
- `getPromptByEnvelopeId()` - for GET endpoint
- `getPromptById()` - for admin operations
- `createPrompt()`, `updatePrompt()`, `deletePrompt()` - admin CRUD

**Vote queries:**
- `getVoteForParticipant()` - check if participant voted
- `getVotesForPrompt()` - get all votes for reveal
- `createVote()` - insert vote record
- `countVotesForPrompt()` - check if reveal ready

### WYR Service (server/src/services/wyr.ts)

**getPromptState(envelopeId, participantId):**
- Returns prompt with current voting state
- Includes myVote, partnerVoted boolean
- Builds results if both have voted

**submitVote(promptId, participantId, choice):**
- Uses `db.$transaction` for race condition safety
- Broadcasts `wyrVoteSubmitted` via SignalR
- If vote count >= 2, triggers reveal:
  - Builds results relative to calling participant
  - Updates envelope status to 'completed'
  - Broadcasts `wyrRevealReady` via SignalR
- Returns `{ revealed, results? }`

### API Routes (server/src/routes/wyr.ts)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/wyr/:envelopeId | auth | Get prompt state for participant |
| POST | /api/wyr/:promptId/vote | auth | Submit vote |
| POST | /api/wyr | admin | Create prompt |
| PATCH | /api/wyr/:id | admin | Update prompt |
| DELETE | /api/wyr/:id | admin | Delete prompt |

## Technical Decisions

### Transaction for Vote Safety

Used Prisma `$transaction` to ensure atomicity:
1. Check prompt exists
2. Check not already voted
3. Create vote
4. Count votes

This prevents race conditions when both participants submit votes simultaneously.

### SignalR Integration Pattern

The service gracefully handles SignalR not being configured:
```typescript
const signalr = getSignalRService();
if (signalr) {
  await signalr.sendToGroup(`activity:${envelopeId}`, message);
}
```

No crash if SIGNALR_CONNECTION_STRING not set - real-time features just silently disabled.

### Results Relative to Participant

Results are built relative to the calling participant:
- `myChoice`: What the current participant chose
- `partnerChoice`: What the other participant chose
- `isMatch`: Whether they match

This allows the client to show personalized results without exposing participant IDs.

## Verification Results

- Build: PASS
- Lint: PASS (1 warning in unrelated SignalR file)
- Tests: 111 PASS (55 client + 56 server)
- Database: Tables created via `prisma db push`

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 073bf35 | feat | Add WYR Prisma models |
| b2fc240 | feat | (empty - lint-staged issue) |
| 694e3c8 | feat | Add WYR types, queries, service, and API routes |

## Deviations from Plan

None - plan executed as written.

## Next Phase Readiness

**Ready for 03-03 (Client WYR Hook):**
- API endpoints available at /api/wyr/*
- Types exported from shared package
- SignalR messages defined for real-time sync

**Prerequisites satisfied:**
- Server is running and accepting WYR API calls
- Database has WyrPrompt and WyrVote tables
- SignalR service can broadcast vote events
