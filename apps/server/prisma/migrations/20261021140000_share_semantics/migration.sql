-- 分享链接的语义补全 + 访问事件表。
--
-- 1) `share_links` 加三列（均为可空、纯新增，回滚即 drop column）
--    - revoked_reason：`revoked_at` 有两个写入来源（作者主动 / 取消发布批量），
--      只靠时间戳说不清"为什么失效"，admin 与访客展示都需要区分
--    - label / note：多条链接并存时光看 token 无法区分，R4 的列表需要它
-- 2) `share_events`：匿名高频的访问事实，与有 actor 的 `audit_logs` 分表

ALTER TABLE "share_links" ADD COLUMN "revoked_reason" VARCHAR(32);
ALTER TABLE "share_links" ADD COLUMN "label" VARCHAR(64);
ALTER TABLE "share_links" ADD COLUMN "note" VARCHAR(255);

CREATE TABLE "share_events" (
    "id" BIGSERIAL NOT NULL,
    "share_id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "revision" SMALLINT,
    "theme_key" VARCHAR(32),
    "target_host" VARCHAR(255),
    "page_path" VARCHAR(255),
    "visitor_key" VARCHAR(64),
    "session_id" VARCHAR(64),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "referrer" VARCHAR(512),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "share_events_share_id_name_created_at_idx" ON "share_events"("share_id", "name", "created_at");
CREATE INDEX "share_events_share_id_category_created_at_idx" ON "share_events"("share_id", "category", "created_at");

ALTER TABLE "share_events" ADD CONSTRAINT "share_events_share_id_fkey"
    FOREIGN KEY ("share_id") REFERENCES "share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
