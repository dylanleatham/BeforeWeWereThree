-- AlterTable: Make designation nullable (admin/friend participants don't need one)
ALTER TABLE "participants" ALTER COLUMN "designation" DROP NOT NULL;

-- CreateIndex: Add missing participantId index on name_game_guidance
CREATE INDEX "name_game_guidance_participant_id_idx" ON "name_game_guidance"("participant_id");
