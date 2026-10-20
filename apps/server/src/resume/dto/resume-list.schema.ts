import { z } from 'zod'

/**
 * 允许的排序字段 —— **白名单**。
 *
 * 不接受"任意列名"，否则等于把 `orderBy` 交给客户端：轻则按未索引列排序拖慢查询，
 * 重则暴露内部字段名。加一个新维度必须同时改这里与 service 的映射（两处都看得见）。
 */
export const RESUME_LIST_SORTS = ['updatedAt', 'createdAt', 'name'] as const
export type ResumeListSort = (typeof RESUME_LIST_SORTS)[number]

/**
 * 简历列表的查询入参：**分页 + 搜索 + 筛选 + 排序**。
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
 *
 * ## 搜索 / 筛选 / 排序的三个刻意写法
 *
 * 1. **`q` 允许空串，service 视为"没传"**：若把空串当有效关键词，会退化成 `LIKE '%%'`
 *    —— 语法没错、索引却用不上，还让人以为"搜索生效了但没筛出东西"。
 * 2. **`published` 用 `enum(['true','false'])` + `transform`，不用 `z.coerce.boolean()`**：
 *    后者把字符串 `'false'` 转成 `true`（非空字符串即真），于是"只看未发布"会返回全部
 *    —— 一个不报错、只给错结果的经典陷阱。
 * 3. **`sort` / `order` 在 schema 里不写默认值**：默认值只在 service 里决定一处，
 *    避免前后端各持一份默认、改了一边忘另一边。
 */
export const resumeListSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  /** 按名称模糊搜索（不区分大小写）；空白视为未传 */
  q: z.string().trim().max(80).optional(),
  /** 只看已发布（true）/ 只看未发布（false）；不传 = 全部 */
  published: z
    .enum(['true', 'false'])
    .transform(value => value === 'true')
    .optional(),
  sort: z.enum(RESUME_LIST_SORTS).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export type ResumeListDto = z.infer<typeof resumeListSchema>
