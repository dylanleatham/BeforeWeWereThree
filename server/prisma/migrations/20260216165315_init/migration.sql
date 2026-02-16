-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "device_fingerprint" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envelopes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sealed',
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wyr_prompts" (
    "id" TEXT NOT NULL,
    "envelope_id" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wyr_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wyr_votes" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wyr_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letter_prompts" (
    "id" TEXT NOT NULL,
    "envelope_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "letter_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letters" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "photo_url" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "blob_url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "participants_device_fingerprint_key" ON "participants"("device_fingerprint");

-- CreateIndex
CREATE INDEX "wyr_prompts_envelope_id_idx" ON "wyr_prompts"("envelope_id");

-- CreateIndex
CREATE UNIQUE INDEX "wyr_prompts_envelope_id_sort_order_key" ON "wyr_prompts"("envelope_id", "sort_order");

-- CreateIndex
CREATE INDEX "wyr_votes_participant_id_idx" ON "wyr_votes"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "wyr_votes_prompt_id_participant_id_key" ON "wyr_votes"("prompt_id", "participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "letter_prompts_envelope_id_key" ON "letter_prompts"("envelope_id");

-- CreateIndex
CREATE INDEX "letters_participant_id_idx" ON "letters"("participant_id");

-- CreateIndex
CREATE INDEX "letters_prompt_id_idx" ON "letters"("prompt_id");

-- CreateIndex
CREATE UNIQUE INDEX "letters_prompt_id_participant_id_key" ON "letters"("prompt_id", "participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "photos_blob_url_key" ON "photos"("blob_url");

-- CreateIndex
CREATE INDEX "photos_uploaded_by_id_idx" ON "photos"("uploaded_by_id");

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
ALTER TABLE "wyr_prompts" ADD CONSTRAINT "wyr_prompts_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wyr_votes" ADD CONSTRAINT "wyr_votes_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "wyr_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wyr_votes" ADD CONSTRAINT "wyr_votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_prompts" ADD CONSTRAINT "letter_prompts_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "letter_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "name_game_rounds" ADD CONSTRAINT "name_game_rounds_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "name_game_names" ADD CONSTRAINT "name_game_names_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "name_game_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "name_game_votes" ADD CONSTRAINT "name_game_votes_name_id_fkey" FOREIGN KEY ("name_id") REFERENCES "name_game_names"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "name_game_votes" ADD CONSTRAINT "name_game_votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
