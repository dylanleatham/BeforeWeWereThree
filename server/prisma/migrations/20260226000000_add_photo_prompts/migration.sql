-- CreateTable
CREATE TABLE "photo_prompts" (
    "id" TEXT NOT NULL,
    "envelope_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_prompt_responses" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_prompt_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photo_prompts_envelope_id_key" ON "photo_prompts"("envelope_id");

-- CreateIndex
CREATE UNIQUE INDEX "photo_prompt_responses_prompt_id_participant_id_key" ON "photo_prompt_responses"("prompt_id", "participant_id");

-- CreateIndex
CREATE INDEX "photo_prompt_responses_participant_id_idx" ON "photo_prompt_responses"("participant_id");

-- CreateIndex
CREATE INDEX "photo_prompt_responses_prompt_id_idx" ON "photo_prompt_responses"("prompt_id");

-- AddForeignKey
ALTER TABLE "photo_prompts" ADD CONSTRAINT "photo_prompts_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_prompt_responses" ADD CONSTRAINT "photo_prompt_responses_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "photo_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_prompt_responses" ADD CONSTRAINT "photo_prompt_responses_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
