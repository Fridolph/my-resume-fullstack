import type { AuditAction, AuditResourceType } from '@rs/common'

/**
 * 审计日志的读接口（admin 侧，**仅超管**）。
 *
 * ## 一条记录是什么
 *
 * 审计行是**自包含**的：`actorSnapshot` / `resourceSnapshot` 都是写入时刻的快照，
 * 不对当前用户表做 join（`User` 会被物理清理，快照补不回来）。
 * 所以这里的类型包含 `metadata` / `resourceSnapshot` 两个宽松 JSON —— 它们的形状**按动作而异**，
 * 由 `config/audit-labels.ts` 的摘要函数负责解释，不在类型层硬编码联合。
 *
 * ## 为什么 `$api` 带 `silent: true` + `retry: 0`
 *
 * 与简历列表同理：失败要落到**页面自己的错误区**。
 * 尤其 403 —— 重试一百次也不会变成有权限，而"重试"这个动作会让用户以为是自己点错了。
 */
export interface AuditLogRow {
  id: string
  /** 操作者 id（cuid） */
  actorId: string
  /** 操作者**当时**的昵称快照 */
  actorSnapshot: { nickname?: string | null } | null
  /** 操作者**当时**的角色键快照（不是当前角色） */
  actorRoleKeys: string[]
  action: AuditAction
  resourceType: AuditResourceType
  /** 资源 id：简历是整数、用户是 cuid —— 一律按字符串处理 */
  resourceId: string
  resourceSnapshot: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  /** 关联那次请求的访问日志 */
  requestId: string | null
  /** ISO 时间串 */
  occurredAt: string
}

export interface AuditLogPage {
  items: AuditLogRow[]
  total: number
  page: number
  pageSize: number
}

export interface AuditLogQuery {
  page?: number
  pageSize?: number
  /** 动作过滤（后端新增的可选参数） */
  action?: AuditAction
  actorId?: string
  resourceType?: AuditResourceType
  resourceId?: string
  /** ISO 时间串（含） */
  from?: string
  /** ISO 时间串（含） */
  to?: string
}

export function createAuditApi() {
  const { $api } = useNuxtApp()

  return {
    /** 分页查询；后端按 `occurredAt` 新 → 旧返回 */
    list: (query: AuditLogQuery) => $api<AuditLogPage>('/audit-logs', { query, silent: true, retry: 0 }),
  }
}
