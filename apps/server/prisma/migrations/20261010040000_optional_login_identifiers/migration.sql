BEGIN;

ALTER TABLE "users"
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "nickname" DROP NOT NULL;

ALTER TABLE "users"
  ADD CONSTRAINT "users_username_or_email_check"
  CHECK ("username" IS NOT NULL OR "email" IS NOT NULL);

COMMIT;
