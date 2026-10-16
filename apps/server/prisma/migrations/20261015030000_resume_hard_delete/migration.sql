-- 简历删除改为硬删除：去掉软删字段、清理历史软删数据、草稿随简历级联删除。
--
-- 背景（DAO-033）：用户账号保留软删（审计 / 恢复 / 责任边界），但**简历正文是用户自己生成的内容**，
-- 软删只会让库里持续积累看不见的简历与草稿。用户点删除就是不要了，直接删。
--
-- ⚠️ 不可逆：本迁移会物理删除 `deleted_at IS NOT NULL` 的简历（及其草稿），回滚只能把列加回来，
--    已清理的数据无法恢复。执行前已与 Owner 确认。

-- 1) 外键改级联：草稿属于简历，简历不存在时草稿也没有意义。
--    同时这也是硬删的前提 —— 原约束是 ON DELETE RESTRICT，会直接把 DELETE 拦住。
ALTER TABLE "resume_drafts" DROP CONSTRAINT "resume_drafts_resume_id_fkey";
ALTER TABLE "resume_drafts" ADD CONSTRAINT "resume_drafts_resume_id_fkey"
  FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) 清理历史软删数据：删简历，草稿由上面的级联带走。
--    只作用于"已经被用户删过"的记录（deleted_at 非空），不影响任何在用简历。
DELETE FROM "resumes" WHERE "deleted_at" IS NOT NULL;

-- 3) 去掉软删字段与其复合索引；索引收窄为纯粹的用户维度。
DROP INDEX "resumes_workspace_user_id_deleted_at_idx";
ALTER TABLE "resumes" DROP COLUMN "deleted_at";
CREATE INDEX "resumes_workspace_user_id_idx" ON "resumes"("workspace_user_id");
