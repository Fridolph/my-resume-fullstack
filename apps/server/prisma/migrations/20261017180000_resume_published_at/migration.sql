-- 发布态：`null` 表示未发布 —— 公开读（`/resume/public*`）只认已发布的简历。
--
-- 为什么用可空时间戳而不是布尔：一个字段同时表达「是否发布」与「何时发布」，
-- 且判据只有一条（IS NULL / IS NOT NULL），不会随「某些历史数据是例外」而漂移。
ALTER TABLE "resumes" ADD COLUMN "published_at" TIMESTAMP(3);

-- 存量回填（Owner 2026-10-17 决定，方案 B-iii）：**只回填「设为默认」的那份**。
--
-- 取舍：首页那份继续可见（演示不中断），其余简历需作者显式发布。
-- 代价已知并接受：迁移后非默认简历的公开链接会变 404 —— 请到列表页逐个发布。
--
-- 这条 UPDATE 是数据变更，不参与 schema 漂移检测（`migrate dev` 只比 schema），
-- 因此手写迁移不会让后续 `migrate dev` 报 drift。
UPDATE "resumes" SET "published_at" = "created_at" WHERE "is_default" = true;
