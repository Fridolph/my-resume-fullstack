-- 「默认展示」的简历（每个用户至多一份）。
--
-- 只加一列，不动数据：已有简历都是 false（没有默认，首页会引导去列表页选一份）。
-- 未加 partial unique index（`WHERE is_default`）：Prisma schema 无法表达它，
-- 会让每次 `migrate dev` 都报告漂移；互斥改由 `setDefault` 在同一事务里保证。
ALTER TABLE "resumes" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;
