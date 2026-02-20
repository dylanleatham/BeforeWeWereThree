-- CreateTable
CREATE TABLE "gender_reveal_configs" (
    "id" TEXT NOT NULL,
    "envelope_id" TEXT NOT NULL,
    "gender_value" TEXT NOT NULL,
    "key_a" TEXT NOT NULL,
    "key_b" TEXT NOT NULL,
    "key_a_validated" BOOLEAN NOT NULL DEFAULT false,
    "key_b_validated" BOOLEAN NOT NULL DEFAULT false,
    "revealed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gender_reveal_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gender_reveal_configs_envelope_id_key" ON "gender_reveal_configs"("envelope_id");

-- AddForeignKey
ALTER TABLE "gender_reveal_configs" ADD CONSTRAINT "gender_reveal_configs_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
