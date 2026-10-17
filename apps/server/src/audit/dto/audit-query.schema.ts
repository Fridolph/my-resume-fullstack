import { AUDIT_ACTIONS, type AuditAction } from '@rs/common'
import { z } from 'zod'

/**
 * 动作的可选值**直接取自共享字典**，不在这里另抄一份字符串数组：
 * 往 `AUDIT_ACTIONS` 加动作时，过滤条件自动可用，不会出现"字典有新动作、查询查不到"。
 * 断言成元组的唯一原因是 `z.enum` 需要非空元组类型，运行时仍是同一个数组。
 */
const AUDIT_ACTION_VALUES = Object.values(AUDIT_ACTIONS) as [AuditAction, ...AuditAction[]]

/**
 * 审计查询的入参 schema。
 *
 * ## 为什么分页上限写在这里（而不是只写在 service）
 *
 * service 里也做了收口（`Math.min(100, …)`），两处不重复劳动而是**分工不同**：
 * - schema 这一层把"pageSize=10000"直接挡在**请求入口**，返回 400 并指出字段名；
 * - service 那一层兜住**内部调用**（将来若有非 HTTP 入口，绕过 schema 也不会拖垮数据库）。
 *
 * `z.coerce`：HTTP 查询串里一切都是字符串，必须显式转换。
 * 不用 `z.coerce.number()` 裸转 —— `''` 会被转成 `0`，而 `0` 对分页是无效值，
 * 报"必须是正整数"比"悄悄按第一页处理"更诚实。
 */
export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  /** 资源类型；取值与共享层 `AUDIT_RESOURCE_TYPES` 一致 */
  resourceType: z.enum(['resume', 'user', 'role']).optional(),
  resourceId: z.string().min(1).max(64).optional(),
  actorId: z.string().min(1).max(64).optional(),
  /** 动作标识（如 `role.change`）；值域见共享层 `AUDIT_ACTIONS` */
  action: z.enum(AUDIT_ACTION_VALUES).optional(),
  /** 起始时间（含）；ISO 字符串 */
  from: z.coerce.date().optional(),
  /** 结束时间（含） */
  to: z.coerce.date().optional(),
})

export type AuditQueryDto = z.infer<typeof auditQuerySchema>
