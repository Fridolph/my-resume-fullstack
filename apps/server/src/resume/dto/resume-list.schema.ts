import { z } from 'zod'

/**
 * 简历列表的分页入参。
 *
 * ## 为什么把上限写在 schema
 *
 * service 里也做了同样的收敛（`Math.min(100, …)`），两者分工不同：
 * - 这一层把 `pageSize=10000` 挡在**请求入口**，返回 400 并指出是哪个字段；
 * - service 那一层兜住**非 HTTP 入口**（内部任务、脚本），绕过 schema 也不会把大查询打到库上。
 *
 * `z.coerce`：查询串里一切都是字符串，必须显式转换。
 * 不用裸 `z.coerce.number()` 转 `''`（会变成 0，而 0 对分页是无意义值）——
 * 报"必须是正整数"比"悄悄按第一页处理"更诚实。
 */
export const resumeListSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

export type ResumeListDto = z.infer<typeof resumeListSchema>
