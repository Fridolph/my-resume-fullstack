-- 分享链接：链接级授权（有效期 / 可撤销 / 权限位）。
-- 与作者级的 `resumes.published_at` 是两层：链接授权不能绕过"未发布不可读"。
--
-- 迁移是**纯新增表**，不改既有表结构 —— 回滚即 drop（已发出的链接随之全部失效）。
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "resume_id" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "allow_ai" BOOLEAN NOT NULL DEFAULT false,
    "allow_pdf" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_access_at" TIMESTAMP(3),

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- token 是公开端点上的唯一凭证：唯一索引既保证不重复，也是查询入口
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");
CREATE INDEX "share_links_resume_id_idx" ON "share_links"("resume_id");
CREATE INDEX "share_links_expires_at_idx" ON "share_links"("expires_at");

ALTER TABLE "share_links" ADD CONSTRAINT "share_links_resume_id_fkey"
    FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- `created_by` 用 RESTRICT：用户删除走软删，真要硬删时这里会拦住，
-- 避免"链接还在、但不知道是谁建的"
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
