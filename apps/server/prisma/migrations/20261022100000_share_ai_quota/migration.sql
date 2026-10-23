-- AI 配额：把 `allow_ai` 布尔换成「轮数配额」。
--
-- 为什么布尔不够：Owner 要的是"AI 对话轮数可配置"，而布尔只能表达"能不能"，
-- 表达不了"多少次"。多人在共享一条链接时更没法分摊。
--
-- 为什么配额挂在**链接**上而不是简历/用户上：
-- 同一份简历可能分享出 10 条链接。按简历计数，10 条链接的用量会混在一起，
-- 既说不清"是谁用掉的"，也不能单独撤销某一条的配额。
-- `shareId` 是 AI 能力的**唯一读取标识**（Owner 2026-10-22 定）。
--
-- 为什么额外存 `ai_used` 计数而不只依赖 share_events：
-- 配额扣减必须**原子**（`UPDATE ... WHERE ai_used < ai_quota`），
-- 靠"先 count 事件再判断"在并发下会超卖。

ALTER TABLE "share_links" DROP COLUMN "allow_ai";
ALTER TABLE "share_links" ADD COLUMN "ai_quota" SMALLINT;
ALTER TABLE "share_links" ADD COLUMN "ai_used" INTEGER NOT NULL DEFAULT 0;
