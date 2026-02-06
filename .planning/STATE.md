# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Two people, one screen each, sharing moments that matter.
**Current focus:** Phase 3 - Real-Time Sync & Would You Rather

## Current Position

Phase: 3 of 7 (Real-Time Sync & Would You Rather)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-06 - Completed 03-03-PLAN.md

Progress: [█████████████████████.......] 75% (Phase 3)
Overall:  [█████████████████..........] 46% (11/24 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: ~22 min (including manual debugging)
- Total execution time: ~4 hours 17 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4/4 | ~2 hrs | ~30 min |
| 02 | 4/4 | ~18 min | ~5 min |
| 03 | 3/4 | ~119 min | ~40 min |

**Recent Trend:**
- Last 5 plans: 02-04 (~10 min), 03-01 (~15 min), 03-02 (~43 min), 03-03 (~61 min)
- Trend: UI component plans moderate duration

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 01-01 | npm workspaces for monorepo | Simpler than turborepo for project size |
| 01-01 | Express 5 | Native async error handling |
| 01-01 | Azure OIDC auth | More secure than publish profiles |
| 01-02 | Azure Front Door Standard tier | Classic retiring March 2027, Standard supports managed certs |
| 01-02 | Cache purge with --no-wait | Prevents CI/CD pipeline timeout |
| 01-03 | Prisma schema in server/prisma/ | Monorepo workspace-specific location |
| 01-03 | General Purpose PostgreSQL tier | Avoids Burstable CPU credit issues |
| 01-03 | Port 5432 (not 6432) | PgBouncer port not working reliably |
| 01-03 | Migrations via GitHub Actions | More reliable than App Service startup |
| 01-04 | Express 5 catch-all: /{*splat} | New path-to-regexp requires named wildcards |
| 01-04 | jose for JWT | ESM-native, Edge-compatible |
| 01-04 | FingerprintJS for device ID | Reliable cross-browser fingerprinting |
| 02-01 | motion package (v12+) | Import from 'motion/react', not deprecated 'framer-motion' |
| 02-01 | CSS variables for all styling | Design tokens in variables.css, no hardcoded hex in components |
| 02-01 | Explicit ButtonProps interface | Avoids TypeScript conflict with motion.button props |
| 02-02 | String enums for envelope type/status | Prisma stores as String, TypeScript provides type safety |
| 02-02 | Express 5 typed params | Request<{ id: string }> for route parameters |
| 02-04 | Wax seal instead of ribbon | Ribbon looked goofy; wax seal is elegant and fits aesthetic |
| 02-04 | DELETE returns JSON (not 204) | Consistent API response shape, avoids client JSON parse error |
| 02-04 | Swipe looping enabled | Pile wraps around for continuous navigation |
| 03-01 | Azure SignalR REST API pattern | No Node SDK exists; server uses REST API, clients use WebSocket |
| 03-01 | jose for SignalR JWT | Reuse existing library for access token generation |
| 03-01 | Ref pattern for event handlers | Avoids stale closures in useSignalREvent hook |
| 03-01 | Lazy SignalR service singleton | Graceful degradation when env var missing |
| 03-02 | Prisma $transaction for WYR votes | Prevents race conditions when both participants vote |
| 03-02 | SignalR group per envelope | activity:envelopeId for activity-specific messaging |
| 03-02 | Reveal on vote count >= 2 | Simple count check after transaction ensures both votes in |
| 03-03 | Gesture on wrapper div pattern | Apply useDrag bind() to wrapper, animate inner motion.div |
| 03-03 | Glow effect for match celebration | Intimate aesthetic - subtle, not confetti |

### Pending Todos

None currently

### Blockers/Concerns

- Azure SignalR Service needs to be configured before end-to-end testing (see 03-01-USER-SETUP.md)

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed 03-03-PLAN.md
Resume file: None

**Phase 3 Progress:**
- [x] 03-01: SignalR Infrastructure (complete, 2026-02-06)
- [x] 03-02: WYR Data Model & API (complete, 2026-02-06)
- [x] 03-03: WYR UI Components (complete, 2026-02-06)
- [ ] 03-04: useWouldYouRather hook
