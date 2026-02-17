-- CreateTable
CREATE TABLE "friends" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend_thank_you_notes" (
    "id" TEXT NOT NULL,
    "friend_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "media_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friend_thank_you_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend_letters" (
    "id" TEXT NOT NULL,
    "friend_id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "media_url" TEXT,
    "media_type" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friend_letters_pkey" PRIMARY KEY ("id")
);

-- Add friend_id column to participants
ALTER TABLE "participants" ADD COLUMN "friend_id" TEXT;

-- Add friend_letter_id column to envelopes
ALTER TABLE "envelopes" ADD COLUMN "friend_letter_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "friends_pin_key" ON "friends"("pin");

-- CreateIndex
CREATE UNIQUE INDEX "friend_thank_you_notes_friend_id_key" ON "friend_thank_you_notes"("friend_id");

-- CreateIndex
CREATE UNIQUE INDEX "friend_letters_friend_id_recipient_key" ON "friend_letters"("friend_id", "recipient");

-- CreateIndex
CREATE INDEX "friend_letters_friend_id_idx" ON "friend_letters"("friend_id");

-- CreateIndex
CREATE UNIQUE INDEX "envelopes_friend_letter_id_key" ON "envelopes"("friend_letter_id");

-- CreateIndex
CREATE INDEX "participants_friend_id_idx" ON "participants"("friend_id");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envelopes" ADD CONSTRAINT "envelopes_friend_letter_id_fkey" FOREIGN KEY ("friend_letter_id") REFERENCES "friend_letters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_thank_you_notes" ADD CONSTRAINT "friend_thank_you_notes_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_letters" ADD CONSTRAINT "friend_letters_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
