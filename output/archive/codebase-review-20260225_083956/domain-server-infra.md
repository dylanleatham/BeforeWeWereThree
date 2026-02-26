## Domain Review: Server Infrastructure

### Files Reviewed
- `server/src/index.ts`
- `server/src/middleware/auth.ts`
- `server/src/middleware/rateLimit.ts`
- `server/src/routes/admin.ts`
- `server/src/routes/auth.ts`
- `server/src/routes/config.ts`
- `server/src/routes/health.ts`
- `server/src/routes/signalr.ts`
- `server/src/services/admin.ts`
- `server/src/services/participant.ts`
- `server/src/services/session.ts`
- `server/src/services/realtime.ts`
- `server/src/db/connection.ts`
- `server/src/db/queries/config.ts`
- `server/src/utils/keyHash.ts`
- `server/src/utils/logger.ts`
- `server/prisma.config.ts`
- `server/prisma/schema.prisma`
- `server/prisma/seed.ts`
- `eslint.config.js`
- `package.json`
- `tsconfig.json`

### Issues Found

#### CRITICAL — Must Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-infra-001 | `server/src/middleware/rateLimit.ts:168-191` | Rate limiter store initialization race — async store setup races with synchronous fallback that creates a second independent store instance. Attempts counted before the promise settles are discarded, allowing bypass of the 5-attempt limit during the startup window. | Make the store initialization synchronous by using the in-memory store immediately and only swapping to the persistent store after the promise settles, preserving counts from the in-memory store during the transition. |
| CR-infra-002 | `server/src/middleware/rateLimit.ts:70-76` | `increment()` returns 0 for unknown keys with a silent fallback — the `\|\| entry.count + 1` fallback in callers silently masks the semantic contract between `set` and `increment`, making the limiter fragile to future changes. | Have `increment()` throw or return a clear sentinel when the key doesn't exist, rather than silently returning 0. |
| CR-infra-003 | `server/src/routes/auth.ts:52-60` | PINs stored and compared in plaintext — both guest and admin PINs are raw strings in the `app_config` table. `server/src/utils/keyHash.ts` implements scrypt-based hashing with `timingSafeEqual` and is entirely unused. Any read access to the DB reveals both PINs immediately. | Hash PINs on write using the existing `keyHash.ts` utilities. Compare with `verifyKey()` on login. Migrate existing plaintext PINs with a one-time script. |

#### HIGH — Should Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-infra-004 | `server/src/services/realtime.ts` | Unhandled async rejection in Socket.io `joinGroup` listener — if the join callback throws, there's no error handler, risking server crash. | Wrap the joinGroup listener body in try/catch and emit an error event back to the client. |
| CR-infra-005 | `server/src/services/participant.ts` | TOCTOU gap in participant creation — check for existing participant and create are separate operations without a transaction. Two concurrent requests with the same fingerprint could both pass the check and attempt to create, causing a unique constraint violation. | Use `upsert` or wrap in a Serializable transaction. |
| CR-infra-006 | `server/src/index.ts` | Mid-file value `import` statement — a runtime import appears in the middle of the file rather than at the top, breaking module organization conventions. | Move all imports to the top of the file. |
| CR-infra-007 | `server/src/utils/keyHash.ts` | Timing side-channel in `safeCompare` — early-returns on length mismatch before reaching `timingSafeEqual`, leaking information about the expected length. | Pad or hash both inputs to equal length before comparison, or always run `timingSafeEqual` with fixed-length hashes. |
| CR-infra-008 | `server/src/middleware/auth.ts` | `optionalAuthMiddleware` skips the participant-existence check that `authMiddleware` and `adminAuthMiddleware` perform. If optional-auth routes rely on `req.participant` being a valid DB record, this could cause downstream null references. | Add the same participant lookup to `optionalAuthMiddleware`, or document that optional-auth routes must handle missing participants. |
| CR-infra-009 | `server/src/middleware/auth.ts` | JWT fallback secret used in non-production non-development environments — if `NODE_ENV` is not exactly `production` or `development`, the fallback secret is used, which may be insecure in staging environments. | Only allow the fallback in `development`. Throw on missing secret in all other environments. |
| CR-infra-010 | `server/src/services/realtime.ts` | Module-level mutable state — the realtime adapter instance and connection tracking are stored in module-level variables, causing fragile test isolation between test suites. | Use a factory pattern or dependency injection to make the realtime service testable without module-level state. |

#### MEDIUM — Worth Fixing
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-infra-011 | `server/src/middleware/auth.ts` | Code duplication across three auth middleware functions — token extraction, verification, and participant lookup are repeated with minor variations. | Extract shared logic into helper functions (e.g., `extractToken`, `verifyAndLookup`). |
| CR-infra-012 | `server/src/services/realtime.ts`, `server/src/db/connection.ts` | `parseConnectionString` is duplicated across two files with slightly different implementations. | Extract to a shared utility in `server/src/utils/`. |
| CR-infra-013 | `server/src/routes/config.ts` | Dead code — unused branch or handler that's never reached based on the current config structure. | Remove the dead code path. |
| CR-infra-014 | `server/src/services/admin.ts` | `resetSession` function has no return type annotation on the exported function. | Add explicit `Promise<ResetSessionResult>` return type. |
| CR-infra-015 | `server/src/services/session.ts` | No validation on session configuration values passed to the service layer. | Add Zod validation at the service boundary. |
| CR-infra-016 | `server/prisma/schema.prisma` | Discriminator columns (like `type`, `status`, `role`) use plain `String` types instead of Prisma enums. This allows arbitrary values in the DB. | Convert to Prisma `enum` types for type safety at the database level. |
| CR-infra-017 | `eslint.config.js` | `no-explicit-any` is set to `warn` instead of `error`. CLAUDE.md says "no `any`" is a non-negotiable, but ESLint won't block it. | Change to `error` to enforce the non-negotiable. |
| CR-infra-018 | `server/src/middleware/rateLimit.ts` | Rate limiter configuration values (window sizes, max attempts) are hardcoded magic numbers in the middleware. | Extract to constants in a config file. |
| CR-infra-019 | `server/src/services/realtime.ts` | Missing explicit return types on several exported functions. | Add return type annotations to all exported functions. |

#### LOW — Nice to Have
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-infra-020 | `server/prisma/seed.ts` | Seed data is minimal and could include more representative test data for all activity types. | Expand seed data to cover all envelope types and activity states. |
| CR-infra-021 | `server/src/utils/logger.ts` | Logger uses `console.log`/`console.error` directly without structured logging. | Consider a structured logger (pino or winston) for production observability. |
| CR-infra-022 | `server/src/routes/health.ts` | Health endpoint only returns `{ status: 'ok' }` without checking DB connectivity or realtime service status. | Add DB ping and realtime adapter health checks. |
| CR-infra-023 | `server/src/index.ts` | CSP directives are inline in the Express setup rather than in a separate config object. | Extract CSP configuration to a dedicated config for readability. |
| CR-infra-024 | `package.json` | No `engines` field to specify required Node.js version. | Add `"engines": { "node": ">=18" }` or appropriate version. |

### Positive Observations
- The `keyHash.ts` utility is correctly implemented with scrypt and timingSafeEqual — it just needs to be wired up.
- The dual-transport realtime pattern (Socket.io local / SignalR production) is well-architected with a clean adapter interface.
- Helmet CSP is configured and updated for Azure Blob Storage origins.
- The auth middleware pattern of extracting participant from JWT and attaching to `req` is clean and consistent.
- Prisma migrations are well-organized with meaningful names and proper sequencing.

### Domain Health Score
6/10 — Strong architectural foundations but several security issues (plaintext PINs, rate limiter race, timing side-channel) bring the score down. The infrastructure code would benefit from hardening the auth and rate-limiting layers.
