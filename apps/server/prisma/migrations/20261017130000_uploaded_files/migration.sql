-- 上传文件记录（DAO-036）。
--
-- 只加表，**不改任何既有表**。`owner_id` 不挂外键：与审计同理 ——
-- 账号被清理后，"这个文件当初是谁传的"仍然要能读懂。
CREATE TABLE "uploaded_files" (
    "id" SERIAL NOT NULL,
    "owner_id" TEXT NOT NULL,
    "purpose" VARCHAR(40) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "uploaded_files_owner_id_idx" ON "uploaded_files"("owner_id");
CREATE INDEX "uploaded_files_purpose_created_at_idx" ON "uploaded_files"("purpose", "created_at");
