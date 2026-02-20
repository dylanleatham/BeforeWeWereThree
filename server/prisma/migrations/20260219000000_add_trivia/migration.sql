-- CreateTable
CREATE TABLE "trivia_questions" (
    "id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trivia_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trivia_envelope_questions" (
    "id" TEXT NOT NULL,
    "envelope_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "trivia_envelope_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trivia_answers" (
    "id" TEXT NOT NULL,
    "envelope_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "selected_index" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trivia_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trivia_envelope_questions_envelope_id_idx" ON "trivia_envelope_questions"("envelope_id");

-- CreateIndex
CREATE INDEX "trivia_envelope_questions_question_id_idx" ON "trivia_envelope_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "trivia_envelope_questions_envelope_id_question_id_key" ON "trivia_envelope_questions"("envelope_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "trivia_envelope_questions_envelope_id_sort_order_key" ON "trivia_envelope_questions"("envelope_id", "sort_order");

-- CreateIndex
CREATE INDEX "trivia_answers_envelope_id_idx" ON "trivia_answers"("envelope_id");

-- CreateIndex
CREATE INDEX "trivia_answers_participant_id_idx" ON "trivia_answers"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "trivia_answers_envelope_id_question_id_participant_id_key" ON "trivia_answers"("envelope_id", "question_id", "participant_id");

-- AddForeignKey
ALTER TABLE "trivia_envelope_questions" ADD CONSTRAINT "trivia_envelope_questions_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trivia_envelope_questions" ADD CONSTRAINT "trivia_envelope_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "trivia_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trivia_answers" ADD CONSTRAINT "trivia_answers_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
