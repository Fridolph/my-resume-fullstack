import { z } from 'zod'

/**
 * 分享链接的状态筛选。
 *
 * 三个档位互斥且**合起来覆盖全集** —— 否则管理页会出现"哪一档都查不到"的链接。
 * - `active`：未撤销 且 未过期
 * - `expired`：未撤销 但 已过期（过期后仍保留记录，只是不可读）
 * - `revoked`：已撤销（**含因取消发布被批量撤销的**，那种看 `revokedReason` 区分）
 */
export const SHARE_LINK_STATUSES = ['active', 'expired', 'revoked'] as const
export type ShareLinkStatus = (typeof SHARE_LINK_STATUSES)[number]

export const shareListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(SHARE_LINK_STATUSES).optional(),
  /** 只看某一份简历的链接 */
  resumeId: z.coerce.number().int().positive().optional(),
})

export type ShareListQueryDto = z.infer<typeof shareListQuerySchema>
