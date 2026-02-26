## Domain Review: Server Activities

### Files Reviewed
- `server/src/routes/envelopes.ts`
- `server/src/routes/letter.ts`
- `server/src/routes/wyr.ts`
- `server/src/routes/trivia.ts`
- `server/src/routes/nameGame.ts`
- `server/src/routes/genderReveal.ts`
- `server/src/routes/media.ts`
- `server/src/routes/friend.ts`
- `server/src/services/letter.ts`
- `server/src/services/wyr.ts`
- `server/src/services/trivia.ts`
- `server/src/services/nameGame.ts`
- `server/src/services/genderReveal.ts`
- `server/src/services/media.ts`
- `server/src/services/anthropic.ts`
- `server/src/services/friend.ts`
- `server/src/db/queries/envelopes.ts`
- `server/src/db/queries/letter.ts`
- `server/src/db/queries/wyr.ts`
- `server/src/db/queries/trivia.ts`
- `server/src/db/queries/nameGame.ts`
- `server/src/db/queries/genderReveal.ts`
- `server/src/db/queries/media.ts`
- `server/src/db/queries/friend.ts`

### Issues Found

#### CRITICAL — Must Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-act-001 | `server/src/services/genderReveal.ts:288` | `setGenderByFriend` uses `tx.genderRevealConfig.findFirst()` without a `where: { envelopeId }` filter. Finds whichever config was created first across the entire database. If a second config row ever exists, gender would be set on the wrong record. | Pass `envelopeId` as a parameter, or use `findFirst({ where: { envelopeId } })`. At minimum document the singleton assumption. |
| CR-act-002 | `server/src/services/trivia.ts:82-116` | `submitAnswer` has a TOCTOU gap: `getQuestionById`, `getQuestionsByEnvelopeId`, and `createAnswer` are three separate calls with no enclosing transaction. Two participants submitting the last answer simultaneously could both see `isLastQuestion = true`. The completion check is not atomic. | Wrap answer creation and completion check in `db.$transaction` with `Serializable` isolation, consistent with WYR and Name Game voting. |

#### HIGH — Should Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-act-003 | `server/src/routes/trivia.ts:304,308` | Wrong error codes: `QUESTION_NOT_FOUND` translated to `PROMPT_NOT_FOUND` and `ALREADY_ANSWERED` translated to `ALREADY_VOTED`. Clients reading error codes for UI display get wrong domain context. | Use `QUESTION_NOT_FOUND` and `ALREADY_ANSWERED` as the API error codes. |
| CR-act-004 | `server/src/routes/trivia.ts:115,140` | Admin question routes return `PROMPT_NOT_FOUND` for missing trivia questions. Same domain confusion. | Replace with `QUESTION_NOT_FOUND`. |
| CR-act-005 | `server/src/services/wyr.ts:162-163` | `isLastPrompt` fires prematurely for single-prompt envelopes. The `allPrompts.length <= 1` shortcut means any 1-prompt envelope always reports `isLastPrompt = true` on every vote, including the first participant's. | Remove the `allPrompts.length <= 1` shortcut. The general case `allPrompts[last].id === promptId` handles it correctly. |
| CR-act-006 | `server/src/services/genderReveal.ts:186-210` | `configureReveal` does check-then-act without a transaction. Two concurrent admin configure calls could both read `existing = null` and both call `createConfig`, hitting a unique constraint error (500). | Wrap in `db.$transaction` with Serializable, or use Prisma upsert. |
| CR-act-007 | `server/src/routes/friend.ts:376` | `GET /friends/letter/:friendLetterId` returns `FRIEND_NOT_FOUND` when the letter is not found or not submitted. Wrong error code for the failure case. | Use `LETTER_NOT_FOUND`. |
| CR-act-008 | `server/src/services/friend.ts:124` | `getFriendLettersForAdmin` has no explicit return type annotation on an exported async function. TypeScript strict mode can't catch return-shape mismatches. | Add `Promise<{ friend: Friend; letters: FriendLetter[] }>` return type. |
| CR-act-009 | `server/src/routes/letter.ts:153-161` | Submit route calls `saveLetter()` then `submitLetter()` as two separate operations. If a retry hits after the first completes, `saveLetter` throws `ALREADY_SUBMITTED`. | Make `submitLetter` handle the final content save atomically inside the same transaction. |

#### MEDIUM — Worth Fixing
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-act-010 | `server/src/routes/media.ts:121-122` | Pagination params `limit` and `offset` parsed via `parseInt(req.query.X as string)` — non-numeric values produce `NaN`, causing Prisma to receive `take: NaN`. | Use Zod schema for query params, consistent with other routes. |
| CR-act-011 | `server/src/services/nameGame.ts:242-255` | When AI generation fails, cleanup runs but no SignalR broadcast notifies the waiting participant to resubmit. | Broadcast a `name_generation_failed` event via SignalR on the `activity:${envelopeId}` group. |
| CR-act-012 | `server/src/routes/envelopes.ts:86-93` | Gender-reveal singleton check reads all envelopes and filters in-memory rather than a targeted count query. Inefficient and has a small race window. | Use `db.envelope.count({ where: { type: 'gender-reveal' } })` or protect with a unique constraint. |
| CR-act-013 | `server/src/db/queries/nameGame.ts:296-302` | `getAccumulatedMatches` checks `loveVotes.length >= 2` without verifying votes are from distinct participants. Relies implicitly on unique constraint. | Add comment documenting the assumption, or use distinct participant filtering. |
| CR-act-014 | `server/src/services/wyr.ts:166-174` | Completion check uses sequential `count()` per prompt inside a Serializable transaction. For N prompts, this is N queries. | Replace with a single `groupBy` query on `promptId` and check counts. |
| CR-act-015 | `server/src/services/letter.ts:31-68` | `getLetterState` makes 4 sequential DB calls on every page load. | Combine with Prisma `include` to reduce round-trips. |
| CR-act-016 | `server/src/services/anthropic.ts:155` | Default model name hardcoded as `claude-sonnet-4-5-20250929` instead of a constant. | Move to config constant with a comment about keeping in sync. |
| CR-act-017 | `server/src/db/queries/friend.ts:187-200` | Asymmetric null/undefined handling in `updateFriendLetter` — `null` clears fields, `undefined` preserves them, but this is undocumented. | Document the behavior and ensure the submit endpoint's schema aligns. |

#### LOW — Nice to Have
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-act-018 | `server/src/routes/trivia.ts:253` | `GET /trivia/:envelopeId` returns `PROMPT_NOT_FOUND` for missing questions. | Use `QUESTIONS_NOT_FOUND` for domain clarity. |
| CR-act-019 | `server/src/routes/wyr.ts:41-65` | GET route re-checks `participantId` after auth middleware already verified it. Repeated across activity routes. | Extract a `requireParticipantId(req)` helper. |
| CR-act-020 | `server/src/db/queries/nameGame.ts:46-53` | `getNextRoundNumber` and `createRound` are exported but unused — service inlines the logic in its transaction. Dead code. | Remove or mark as internal. |
| CR-act-021 | `server/src/db/queries/wyr.ts:208-221` | `createVote` is exported but unused — service uses raw `tx.wyrVote.create`. Two paths to creating a WYR vote. | Remove the dead query function. |
| CR-act-022 | `server/src/routes/friend.ts:143` | Dead `if (!deleted)` branch — `removeFriend()` always throws `FRIEND_NOT_FOUND` or returns true, never false. | Remove unreachable branch. |
| CR-act-023 | `server/src/services/media.ts:64-78` | `sanitizeFilename` uses `parts.pop()` for extension — `.hidden` files produce unexpected results. | Use `path.extname()` and `path.basename()`. |
| CR-act-024 | `server/src/routes/nameGame.ts:160-164` | Duplicate P2002/P2034 error handling between route and service. Intentional defense-in-depth but undocumented. | Add comment explaining it's defense-in-depth. |

### Positive Observations
- Serializable isolation is used correctly for all count-then-create patterns (WYR voting, Name Game voting, letter submission, gender reveal key validation).
- Gender reveal key validation uses `timingSafeEqual` correctly and never returns gender unless `revealedAt` is set.
- All DB access goes through typed query functions — no raw SQL in routes.
- N+1 queries are proactively avoided with batch fetches.
- Error handling is layered and consistent: services throw sentinel strings, routes catch and map to HTTP codes.
- The `removePhoto` ordering (blob first, then DB) is correct for idempotent cleanup.

### Domain Health Score
7/10 — Solid architecture with correct concurrency patterns for the hard cases. Score held back by inconsistent API error codes, a missing transaction around trivia submission, and several minor polish issues.
