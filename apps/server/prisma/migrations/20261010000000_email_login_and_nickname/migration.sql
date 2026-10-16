BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "users"
    WHERE "email" IS NULL OR btrim("email") = '' OR length(btrim("email")) > 64
  ) THEN
    RAISE EXCEPTION 'Email login migration requires a valid email for every existing user, including deleted users. Backfill emails before retrying.';
  END IF;

  IF EXISTS (
    SELECT lower(btrim("email")) FROM "users"
    GROUP BY lower(btrim("email")) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Email login migration found duplicate normalized emails. Resolve duplicates before retrying.';
  END IF;
END $$;

UPDATE "users" SET "email" = lower(btrim("email"));

ALTER TABLE "users"
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "username" DROP NOT NULL;

ALTER TABLE "users" RENAME COLUMN "displayName" TO "nickname";

COMMIT;
