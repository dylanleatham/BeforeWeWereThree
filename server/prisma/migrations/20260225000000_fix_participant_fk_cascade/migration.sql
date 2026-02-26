-- B-006: Fix participant FK constraints — schema declares onDelete: Cascade
-- but existing migrations created them with ON DELETE RESTRICT.
-- Drop and re-create the 5 affected constraints with ON DELETE CASCADE.

-- 1. wyr_votes.participant_id → participants.id
ALTER TABLE "wyr_votes" DROP CONSTRAINT "wyr_votes_participant_id_fkey";
ALTER TABLE "wyr_votes" ADD CONSTRAINT "wyr_votes_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "participants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. letters.participant_id → participants.id
ALTER TABLE "letters" DROP CONSTRAINT "letters_participant_id_fkey";
ALTER TABLE "letters" ADD CONSTRAINT "letters_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "participants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. photos.uploaded_by_id → participants.id
ALTER TABLE "photos" DROP CONSTRAINT "photos_uploaded_by_id_fkey";
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "participants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. name_game_votes.participant_id → participants.id
ALTER TABLE "name_game_votes" DROP CONSTRAINT "name_game_votes_participant_id_fkey";
ALTER TABLE "name_game_votes" ADD CONSTRAINT "name_game_votes_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "participants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. name_game_guidance.participant_id → participants.id
ALTER TABLE "name_game_guidance" DROP CONSTRAINT "name_game_guidance_participant_id_fkey";
ALTER TABLE "name_game_guidance" ADD CONSTRAINT "name_game_guidance_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "participants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- B-031: Add missing FK constraints on trivia_answers.
-- The trivia migration only created a FK for participant_id but omitted
-- question_id → trivia_questions and envelope_id → envelopes.

-- 6. trivia_answers.question_id → trivia_questions.id
ALTER TABLE "trivia_answers" ADD CONSTRAINT "trivia_answers_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "trivia_questions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. trivia_answers.envelope_id → envelopes.id
ALTER TABLE "trivia_answers" ADD CONSTRAINT "trivia_answers_envelope_id_fkey"
  FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
