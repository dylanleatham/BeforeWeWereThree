# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Two people, one screen each, sharing moments that matter.
**Current focus:** Phase 6 in progress - Trivia Activity

## Current Position

Phase: 6 of 7 (Trivia Activity)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-19 - Completed 06-01-PLAN.md

Progress: [█████] 25% (Phase 6)
Overall:  [██████████████████████████████████████████████] 88% (22/25 plans)

Config:
{
  "mode": "interactive",
  "depth": "comprehensive",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "quality",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  }
}

## Performance Metrics

**Velocity:**
- Total plans completed: 22
- Average duration: ~18 min (including manual debugging)
- Total execution time: ~6.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4/4 | ~2 hrs | ~30 min |
| 02 | 4/4 | ~18 min | ~5 min |
| 03 | 4/4 | ~238 min | ~60 min |
| 04 | 5/5 | ~41 min | ~8 min |
| 05 | 4/4 | ~27 min | ~7 min |
| 06 | 1/4 | ~10 min | ~10 min |

**Recent Trend:**
- Last 5 plans: 05-01 (~6 min), 05-02 (~5 min), 05-03 (~7 min), 05-04 (~9 min), 06-01 (~10 min)
- Trend: Consistent ~5-10 min per plan

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
| 04-01 | 10-minute SAS token expiry | Balance between usability and security for photo uploads |
| 04-01 | submittedAt null/set for letter state | Distinguishes drafts from submitted letters without separate status |
| 04-03 | Upsert pattern for letter auto-save | Eliminates need to check if letter exists before saving |
| 04-03 | Silent auto-save (no SignalR) | No broadcast on PUT to avoid noise; only submit events broadcast |
| 04-03 | Submit saves then marks submitted | Ensures latest content is submitted atomically |
| 04-02 | Browser-direct upload via BlockBlobClient | Better UX with progress tracking than server-side upload |
| 04-02 | yet-another-react-lightbox with plugins | Zoom, Slideshow, Thumbnails plugins for full slideshow experience |
| 04-02 | MediaLibrary doesn't complete | Always available for browsing, unlike WYR with complete flow |
| 04-04 | Reuse PartnerPresence from WYR | DRY principle - same online indicator works for all activities |
| 04-04 | useAutoSave is generic | useAutoSave<T> can be reused for any debounced save operation |
| 04-04 | Flush pending save before submit | Ensures no data loss when submitting letter |
| 04-05 | Golden Hour theme for Spotify button | Not Spotify green - maintain app aesthetic |
| 04-05 | AppConfig key-value for spotifyUrl | Simple extensible pattern for app settings |
| 04-05 | Reset order: letters -> votes -> participants | FK constraint order matters |
| 04-05 | Photos persist across reset | Azure Blob not cleared during session reset |
| 05-01 | Anthropic structured outputs (output_config.format) | Guaranteed valid JSON via constrained decoding, no retry logic needed |
| 05-01 | Default model claude-sonnet-4-5-20250929 | Sweet spot of quality/cost, configurable via ANTHROPIC_MODEL env var |
| 05-01 | Isolated AI service pattern | anthropic.ts wrapper never called from routes, only from nameGame service |
| 05-02 | EnvelopeId lookup via FK chain for vote | name -> round -> envelope FK chain used to resolve SignalR group name |
| 05-02 | Vote progress broadcast with counts | namesVotedCount/totalNames enables client progress UI |
| 05-02 | Three-tier results categorization | matches (both love), nearMisses (love+maybe), worthDiscussing (both maybe) |
| 05-03 | Directional overlay feedback via radial gradients | Opacity tied to drag distance for visual Love/Nope/Maybe hints |
| 05-03 | ResultSection internal sub-component | DRY rendering for match/near-miss/worth-discussing categories |
| 05-04 | Deterministic client-side name shuffling | Seeded Fisher-Yates with participantId hash for per-partner order |
| 05-04 | Name game envelopes never complete | No onComplete from BaseEnvelope, envelope stays opened forever |
| 05-04 | Admin reset FK order for name game | nameGameVote -> nameGameName -> nameGameRound -> participant |
| 06-01 | JSON column for trivia options | Options stored as Prisma Json (PostgreSQL jsonb), cast through unknown to TriviaOption[] |
| 06-01 | Content library with join table | TriviaQuestion standalone + TriviaEnvelopeQuestion join, unlike WYR direct ownership |
| 06-01 | Admin routes use /admin/ prefix | Prevents Express param route collision with envelopeId |

### Pending Todos

None currently

### Blockers/Concerns

- Azure SignalR Service needs to be configured before end-to-end testing (see 03-01-USER-SETUP.md)
- Azure Storage Account needs to be configured for photo uploads (set AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_KEY)
- Anthropic API key needs to be configured for name generation (set ANTHROPIC_API_KEY in server/.env)

### Lessons Learned

Gotchas discovered during development that future phases should avoid:

| Phase | Lesson | Details |
|-------|--------|---------|
| 03-04 | **Envelope type uses hyphens, not underscores** | TypeScript types define `'would-you-rather'` but SQL examples/docs sometimes use `'would_you_rather'`. The switch statement in BaseEnvelope.tsx won't match if DB has wrong format. Always use hyphens: `'would-you-rather'`, `'name-game'`, `'gender-reveal'`. |
| 03-04 | **Guests need dedicated open endpoint** | PATCH /envelopes/:id requires admin. Guests opening envelopes need POST /envelopes/:id/open with authMiddleware. Client must call openEnvelope() for opening, updateEnvelope() for admin status changes. |
| 03-04 | **SignalR 503 without Azure SignalR configured** | Local dev without `SIGNALR_CONNECTION_STRING` shows 503 errors. Real-time features gracefully degrade but console logs errors. Expected behavior - not a bug. |
| 03-04 | **Activities must work offline** | Don't block UI with "Reconnecting" overlays when SignalR unavailable. API calls work without SignalR - real-time sync is enhancement, not requirement. Remove `if (!isConnected) return;` blocking patterns. |
| 03-04 | **Opened envelopes must be navigable** | EnvelopePile and EnvelopeCard originally only allowed clicking sealed envelopes. Users need to return to opened (in-progress) activities. Check `status !== 'completed'` not `status === 'sealed'`. |
| 03-04 | **WYR options must be visible before choosing** | Original design hid options behind swipe card - users couldn't read choices before deciding. Redesigned to show both options upfront as cards, with swipe handle below. UX principle: show all info needed to make a decision. |
| 03-04 | **Prisma field names vs DB column names** | Prisma uses camelCase (`optionA`), DB uses snake_case (`option_a`). Schema has `@map()` directives. In TypeScript use `optionA`, in raw SQL use `option_a`. Table `WyrPrompt` maps to `wyr_prompts`. |
| 03-04 | **WYR requires two participants** | WaitingPhase shows "Waiting for Partner" after voting. Without SignalR, no real-time notification. For solo testing: either use two browser windows (different fingerprints = different participants) or manually insert partner vote in DB. |
| 03-04 | **WYR prompt needs actual content** | Creating envelope doesn't auto-create WYR prompt. Must separately create prompt with option_a and option_b text. Empty strings = nothing displays. |
| 03-03 | **useDrag + motion.div type conflict** | Can't apply `useDrag` bind() directly to `motion.div` - onDrag type signatures conflict. Pattern: wrap with plain div for gesture, inner motion.div for animation. |
| 03-01 | **No Node.js SDK for Azure SignalR** | Server must use REST API to send messages; only clients use WebSocket. Common misconception that there's a server SDK. |
| 02-04 | **DELETE endpoints must return JSON body** | Returning 204 No Content causes `response.json()` to throw. Always return `{ success: true, data: {} }`. |
| 02-01 | **motion/react not framer-motion** | Package renamed in v12+. Import from `'motion/react'`, not deprecated `'framer-motion'`. |
| 04-01 | **Windows Prisma file lock workaround** | EPERM errors on `prisma generate` due to DLL locking. Fix: `rm -rf node_modules/.prisma` before regenerating. Known Windows issue. |
| 05-01 | **Prisma migrate dev fails with drifted DB** | When DB schema was updated via `db push` or direct SQL without migration history, `prisma migrate dev` refuses to create new migrations (drift detected). Use `prisma db push` to sync, then create migration SQL manually for documentation. |
| 05-01 | **Clean BOTH .prisma directories on Windows** | Must delete `node_modules/.prisma` AND `server/node_modules/.prisma` before `prisma generate`. The root workspace also has a `.prisma` cache that can hold file locks. |
| 05-02 | **Anthropic SDK ContentBlock type needs explicit narrowing** | `response.content[0]` may be undefined and `ContentBlock` union includes `ThinkingBlock` without `.text`. Must cast explicitly and check for undefined before accessing `.text`. Jest's ts-jest catches this but esbuild doesn't. |
| 06-01 | **Prisma migrate dev --create-only hangs on Windows with remote DB** | Command does not return when connected to Azure PostgreSQL. Workaround: create migration SQL manually, use `prisma migrate deploy`. The command may silently create a migration directory before hanging. |
| 06-01 | **Prisma Json type requires double-cast** | `question.options as TriviaOption[]` fails in strict mode. Must use `question.options as unknown as TriviaOption[]` for the intermediate cast from `Prisma.JsonValue`. |

### Testing Trivia Locally

1. **Create envelope** with type `'trivia'` (use hyphens if needed!)
2. **Create trivia question** via admin API:
   ```bash
   curl -X POST http://localhost:3000/api/trivia/admin/questions \
     -H "Content-Type: application/json" \
     -H "Cookie: session=<admin-cookie>" \
     -d '{"questionText":"What year were you born?","options":[{"text":"1990","isCorrect":true},{"text":"1991","isCorrect":false}]}'
   ```
3. **Assign question to envelope** via admin API:
   ```bash
   curl -X PUT http://localhost:3000/api/trivia/admin/envelope/<envelope-id>/questions \
     -H "Content-Type: application/json" \
     -H "Cookie: session=<admin-cookie>" \
     -d '{"questionIds":["<question-id>"]}'
   ```
4. **Get trivia state**: `GET /api/trivia/<envelope-id>`
5. **Submit answer**: `POST /api/trivia/<envelope-id>/answer` with `{"questionId":"...","selectedIndex":0}`

### Testing Name Game Locally (Without SignalR)

1. **Create envelope** with type `'name-game'` (use hyphens!)
2. **Open the envelope** (click on it in the pile)
3. **Click "Generate Names"** to start a round (requires ANTHROPIC_API_KEY in server/.env)
4. **Swipe through names** to vote Love/Maybe/Nope
5. **Test with two browser windows** (different fingerprints = different participants)
6. **After both partners vote**, results show with matches highlighted
7. **Click "Ready for more names?"** to start another round

### Testing Letters Locally (Without SignalR)

1. **Create envelope** with type `'letter'` (use hyphens!)
2. **Create letter prompt** in database:
   ```sql
   INSERT INTO letter_prompts (id, envelope_id, prompt, created_at)
   VALUES (gen_random_uuid(), 'envelope-id', 'Write a letter to your baby...', NOW());
   ```
3. **Test with two browser windows** (one normal, one incognito) - different fingerprints get different participant designations
4. **Or simulate partner letter**:
   ```sql
   INSERT INTO letters (id, prompt_id, participant_id, content, submitted_at, created_at, updated_at)
   VALUES (gen_random_uuid(), 'prompt-id', 'partner-participant-id', 'Partner letter content', NOW(), NOW(), NOW());
   ```
5. **Refresh to see results** (no real-time updates without SignalR)

### Testing WYR Locally (Without SignalR)

1. **Create envelope** with type `'would-you-rather'` (hyphens!)
2. **Create WYR prompt** in database:
   ```sql
   INSERT INTO wyr_prompts (id, envelope_id, option_a, option_b, created_at)
   VALUES (gen_random_uuid(), 'envelope-id', 'Option A text', 'Option B text', NOW());
   ```
3. **Test with two browser windows** (one normal, one incognito) - different fingerprints get different participant designations
4. **Or simulate partner vote**:
   ```sql
   INSERT INTO wyr_votes (id, prompt_id, participant_id, choice, created_at)
   VALUES (gen_random_uuid(), 'prompt-id', 'partner-participant-id', 'option_a', NOW());
   ```
5. **Refresh to see results** (no real-time updates without SignalR)

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 06-01-PLAN.md
Resume file: None

**Phase 6 In Progress:**
- [x] 06-01: Trivia Backend Foundation (complete, 2026-02-19)
- [ ] 06-02: Client UI Components
- [ ] 06-03: Client Integration and Wiring
- [ ] 06-04: Admin Content Management

**Phase 6 Plan 01 Accomplishments:**
- TriviaQuestion, TriviaEnvelopeQuestion, TriviaAnswer Prisma models
- Migration SQL for three new database tables
- Shared types with full trivia API contract and Zod schemas
- Typed Prisma query functions for all trivia DB operations
- Business logic service (solo, no SignalR)
- REST API endpoints at /api/trivia (guest: state/answer, admin: CRUD/assign/reorder)
- Admin reset logic for trivia answers
- All existing tests updated and passing
