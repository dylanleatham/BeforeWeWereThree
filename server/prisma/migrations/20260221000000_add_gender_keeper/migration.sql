-- Add isGenderKeeper flag to friends table
ALTER TABLE "friends" ADD COLUMN "is_gender_keeper" BOOLEAN NOT NULL DEFAULT false;

-- Make gender_value nullable (null until friend sets it)
ALTER TABLE "gender_reveal_configs" ALTER COLUMN "gender_value" DROP NOT NULL;

-- Add audit FK: which friend set the gender value
ALTER TABLE "gender_reveal_configs" ADD COLUMN "set_by_friend_id" TEXT;

-- Add foreign key constraint
ALTER TABLE "gender_reveal_configs"
  ADD CONSTRAINT "gender_reveal_configs_set_by_friend_id_fkey"
  FOREIGN KEY ("set_by_friend_id") REFERENCES "friends"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
