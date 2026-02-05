# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Two people, one screen each, sharing moments that matter.
**Current focus:** Phase 3 - Real-Time Sync & Would You Rather

## Current Position

Phase: 3 of 7 (Real-Time Sync & Would You Rather)
Plan: 0 of 4 in current phase
Status: Ready to plan
Last activity: 2026-02-04 - Phase 2 verified and complete

Progress: [..............................] 0% (Phase 3)
Overall:  [████████████...............] 33% (8/24 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~17 min (including manual debugging)
- Total execution time: ~2 hours 18 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4/4 | ~2 hrs | ~30 min |
| 02 | 4/4 | ~18 min | ~5 min |

**Recent Trend:**
- Last 5 plans: 02-01 (6 min), 02-02 (8 min), 02-03 (4 min), 02-04 (~10 min)
- Trend: Fast execution on well-defined tasks

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

### Pending Todos

None currently

### Blockers/Concerns

None. Infrastructure, data layer, and UI foundation operational.

## Session Continuity

Last session: 2026-02-04
Stopped at: Phase 2 verified complete, ready for Phase 3
Resume file: None

**Phase 2 Progress:**
- [x] 02-01: Design System Tokens (complete)
- [x] 02-02: Envelope Data Model (complete)
- [x] 02-03: Envelope UI Components (complete)
- [x] 02-04: Layout and Navigation (complete, verified 2026-02-04)

**Bugs fixed during verification:**
- DELETE endpoint returning 204 (empty body) causing client JSON parse error
- Ribbon animation appearing during envelope open (replaced with wax seal)
- Swipe animation only working in one direction (added direction-aware variants)
- Swipe not looping around pile (added wrapping)
