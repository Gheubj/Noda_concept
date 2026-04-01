-- Add required unique nickname for users.
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;

-- Backfill existing rows with deterministic nickname from id.
UPDATE "User"
SET "nickname" = CONCAT('user_', SUBSTRING("id" FROM 1 FOR 10))
WHERE "nickname" IS NULL;

ALTER TABLE "User" ALTER COLUMN "nickname" SET NOT NULL;
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
