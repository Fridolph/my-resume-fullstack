CREATE TABLE "resume_workspaces" (
  "user_id" TEXT NOT NULL,
  CONSTRAINT "resume_workspaces_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "resumes" (
  "id" TEXT NOT NULL,
  "workspace_user_id" TEXT NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "locale" VARCHAR(20) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_drafts" (
  "resume_id" TEXT NOT NULL,
  "schema_version" INTEGER NOT NULL,
  "document" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updated_by" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resume_drafts_pkey" PRIMARY KEY ("resume_id"),
  CONSTRAINT "resume_drafts_revision_positive" CHECK ("revision" > 0),
  CONSTRAINT "resume_drafts_schema_version_valid" CHECK (
    "schema_version" = 1 AND jsonb_typeof("document") = 'object'
    AND COALESCE("document"->'schemaVersion' = to_jsonb("schema_version"), false)
  )
);

CREATE INDEX "resumes_workspace_user_id_deleted_at_idx" ON "resumes"("workspace_user_id", "deleted_at");

ALTER TABLE "resume_workspaces" ADD CONSTRAINT "resume_workspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_workspace_user_id_fkey" FOREIGN KEY ("workspace_user_id") REFERENCES "resume_workspaces"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resume_drafts" ADD CONSTRAINT "resume_drafts_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resume_drafts" ADD CONSTRAINT "resume_drafts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
