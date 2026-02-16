-- AlterTable
ALTER TABLE "name_game_rounds" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ready';

-- CreateTable
CREATE TABLE "name_game_guidance" (
    "id" TEXT NOT NULL,
    "envelope_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "participant_id" TEXT NOT NULL,
    "guidance" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "name_game_guidance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "name_game_guidance_envelope_id_round_number_idx" ON "name_game_guidance"("envelope_id", "round_number");

-- CreateIndex
CREATE UNIQUE INDEX "name_game_guidance_envelope_id_round_number_participant_id_key" ON "name_game_guidance"("envelope_id", "round_number", "participant_id");

-- AddForeignKey
ALTER TABLE "name_game_guidance" ADD CONSTRAINT "name_game_guidance_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
