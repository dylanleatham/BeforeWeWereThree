-- CreateTable
CREATE TABLE "name_game_rounds" (
    "id" TEXT NOT NULL,
    "envelope_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "guidance" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "name_game_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "name_game_names" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT[],
    "meaning" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "name_game_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "name_game_votes" (
    "id" TEXT NOT NULL,
    "name_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "name_game_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "name_game_rounds_envelope_id_idx" ON "name_game_rounds"("envelope_id");

-- CreateIndex
CREATE UNIQUE INDEX "name_game_rounds_envelope_id_round_number_key" ON "name_game_rounds"("envelope_id", "round_number");

-- CreateIndex
CREATE INDEX "name_game_names_round_id_idx" ON "name_game_names"("round_id");

-- CreateIndex
CREATE INDEX "name_game_votes_participant_id_idx" ON "name_game_votes"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "name_game_votes_name_id_participant_id_key" ON "name_game_votes"("name_id", "participant_id");

-- AddForeignKey
ALTER TABLE "name_game_rounds" ADD CONSTRAINT "name_game_rounds_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "name_game_names" ADD CONSTRAINT "name_game_names_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "name_game_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "name_game_votes" ADD CONSTRAINT "name_game_votes_name_id_fkey" FOREIGN KEY ("name_id") REFERENCES "name_game_names"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "name_game_votes" ADD CONSTRAINT "name_game_votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
