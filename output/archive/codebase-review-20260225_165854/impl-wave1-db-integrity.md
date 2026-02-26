# Wave 1 Implementation: Database Integrity Fixes

**Date:** 2025-02-25
**Issues:** B-006 (CRITICAL), B-007 (CRITICAL), B-030 (HIGH), B-031 (HIGH)

---

## B-006: Schema/migration FK mismatch (CRITICAL) -- FIXED

**Problem:** The Prisma schema declares `onDelete: Cascade` for 5 participant FK constraints, but the original migrations created them with `ON DELETE RESTRICT`. The live database has RESTRICT behavior, meaning direct participant deletion would throw FK violations instead of cascading.

**Affected constraints:**
- `wyr_votes_participant_id_fkey` (from `20260216165315_init`)
- `letters_participant_id_fkey` (from `20260216165315_init`)
- `photos_uploaded_by_id_fkey` (from `20260216165315_init`)
- `name_game_votes_participant_id_fkey` (from `20260216165315_init`)
- `name_game_guidance_participant_id_fkey` (from `20260216190215_add_name_game_guidance`)

**Fix:** Created migration `20260225000000_fix_participant_fk_cascade` that drops each constraint and re-creates it with `ON DELETE CASCADE ON UPDATE CASCADE`.

**File:** `server/prisma/migrations/20260225000000_fix_participant_fk_cascade/migration.sql`

---

## B-031: Missing FK constraints on trivia_answers (HIGH) -- FIXED

**Problem:** The `trivia_answers` table has `question_id` and `envelope_id` columns but the `20260219000000_add_trivia` migration only created a FK for `participant_id`. The `question_id` and `envelope_id` columns had no FK constraints, meaning orphaned rows could exist without referential integrity enforcement.

**Fix (migration):** Added two FK constraints in the same migration file as B-006:
- `trivia_answers_question_id_fkey` referencing `trivia_questions(id)` with `ON DELETE CASCADE`
- `trivia_answers_envelope_id_fkey` referencing `envelopes(id)` with `ON DELETE CASCADE`

**Fix (schema):** Updated `server/prisma/schema.prisma` to declare the corresponding Prisma relations:
- Added `envelope` and `question` relation fields on `TriviaAnswer`
- Added inverse `triviaAnswers` relation arrays on `Envelope` and `TriviaQuestion`
- Added `@@index([questionId])` for query performance on the new FK

**Files:**
- `server/prisma/migrations/20260225000000_fix_participant_fk_cascade/migration.sql`
- `server/prisma/schema.prisma`

---

## B-007: setGenderByFriend has no envelopeId filter (CRITICAL) -- FIXED

**Problem:** `setGenderByFriend()` in `server/src/services/genderReveal.ts` called `findFirst()` with no `where` clause. If multiple `GenderRevealConfig` rows existed, an arbitrary one would be selected.

**Analysis:** The route `POST /gender-reveal/set-gender` does not include an `envelopeId` parameter -- the friend only has their `friendId` in the session. Adding `envelopeId` to the route would require client changes.

**Fix:** Changed `findFirst()` to filter by `{ genderValue: null }`, which correctly targets the config that has not yet had its gender set. If no config with `genderValue: null` exists, the function performs a second lookup to distinguish between "no config at all" (`REVEAL_NOT_CONFIGURED`) and "gender already set on all configs" (`GENDER_ALREADY_SET`). This preserves the existing error semantics while eliminating the ambiguous query.

**File:** `server/src/services/genderReveal.ts` (lines 282-310)

---

## B-030: Participant type missing friendId (HIGH) -- FIXED

**Problem:** The `Participant` interface in `shared/types/auth.ts` was missing the `friendId` field that exists in the database schema (`participants.friend_id`) and is used throughout the auth system (`ValidatePinResponse`, `SessionPayload`, `SessionResponse` all include `friendId`).

**Fix:** Added `friendId?: string` to the `Participant` interface, matching the optional nature of the database column (nullable FK to `friends.id`).

**File:** `shared/types/auth.ts` (line 98)

---

## Deployment Steps

Before deploying these changes, the following must be run **with the dev server stopped**:

1. `cd server && npx prisma generate` -- regenerate the Prisma client with the new `TriviaAnswer` relations
2. `cd server && npx prisma migrate deploy` -- apply the migration to fix FK constraints
3. `cd shared && npx tsc` -- rebuild shared types with the updated `Participant` interface
4. Restart the dev server

The migration is safe to run on a live database -- it only drops and re-creates FK constraints (no data changes) and adds new FK constraints on columns that already contain valid references.
