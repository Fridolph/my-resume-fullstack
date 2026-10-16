-- 关键操作审计表（Issue #53 / DAO-045）。
--
-- ## 这张表为什么**一个外键都不挂**
--
-- 审计要回答"谁在什么时候对哪份简历做了什么"。而本项目里：
--   * 简历是**物理删除**（见 `Resume` 的注释：代码是用户自己删的，就没必要留）；
--   * 账号是**软删除**（`users.deleted_at`）。
--
-- 如果 `resource_id` / `actor_id` 挂上外键：
--   ON DELETE CASCADE → 删简历那一刻，这条"谁删的"记录被一起删掉，审计等于没有；
--   ON DELETE SET NULL → 记录留下了，但"删的是哪一份"永久丢失，同样回答不了问题。
--
-- 所以这里用「**值引用 + 快照**」：id 只作为值保存，再用 `*_snapshot` 快照保证
-- 资源消失后记录依然**完整可读**。代价是失去数据库级引用完整性 ——
-- 但对审计来说，"可能出现指向已不存在资源的记录"恰恰是它的正常工作状态。
--
-- ## 为什么 `resource_id` 是 TEXT 而不是 INTEGER
--
-- `resumes.id` 是自增整数，而 `users.id` 是 cuid 字符串。
-- 统一成 TEXT 才能在一张表里装下两类资源（也才可能支持将来新增的资源类型）。
--
-- ## 为什么 `actor_role_keys` 用 TEXT[]
--
-- 追责要回答"他**当时**是什么角色"。角色会变，所以必须在写入时刻记快照，
-- 不能靠 join 当前角色表反推。Postgres 原生数组最省事，Prisma 侧是 `String[]`。
--
-- ⚠️ 快照字段（`actor_snapshot` / `actor_role_keys` / `resource_snapshot`）**补不回来**：
-- 第一版不记，那个时点的信息就永久消失，后补的行只会永远显示"当时未知"。
--
-- ## 三个索引各自服务一条真实查询
--
--   (resource_type, resource_id, occurred_at) → "这份简历的历史"（追责最常见入口）
--   (actor_id, occurred_at)                   → "这个人做过什么"
--   (occurred_at)                             → 归档遍历 / 按时间范围审计
--
-- ## 回滚
--
-- 本表独立，不与任何业务表耦合：`DROP TABLE "audit_logs";` 即可完全回滚，
-- 不影响既有表结构与数据。前提是此时还没有代码在写它（顺序见任务卡的执行清单）。
--
-- 注：SQL 由 `prisma migrate diff --from-schema … --to-schema … --script` 生成，
-- 保证与 schema.prisma 一致、不会造成迁移漂移；上面这些注释是人工补充的设计依据。

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_snapshot" JSONB,
    "actor_role_keys" TEXT[],
    "action" VARCHAR(64) NOT NULL,
    "resource_type" VARCHAR(32) NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_snapshot" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_id" TEXT,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_occurred_at_idx" ON "audit_logs"("resource_type", "resource_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_occurred_at_idx" ON "audit_logs"("actor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at");
