import { z } from 'zod'
import { SHARE_EXPIRY_OPTIONS, SHARE_MAX_DAYS } from '../share.types'

/**
 * 建分享链接的入参。
 *
 * 客户端只给**选项**或天数，不给时间戳 —— 上限因此是结构性的（见 `share.types.ts`）。
 */
export const shareCreateSchema = z
  .strictObject({
    expiresIn: z.enum(SHARE_EXPIRY_OPTIONS),
    /** `expiresIn === 'custom'` 时必填，1..90 */
    customDays: z.number().int().min(1).max(SHARE_MAX_DAYS).optional(),
    /**
     * AI 对话轮数配额。**不传 / `null` = 不开放**（与"开放但 0 轮"是两件事）。
     *
     * 上限 200 是防呆：一条链接给一个人用，几百轮已经远超正常对话量；
     * 更大的量应当走"多条链接"，那样额度与统计天然隔离。
     */
    aiQuota: z.number().int().min(1).max(200).nullable().optional(),
    allowPdf: z.boolean().optional(),
    /** 给这条链接起个名（"投给 A 公司"）—— 多条并存时光看 token 无法区分 */
    label: z.string().trim().max(64).optional(),
    /** 可选备注：谁、什么场合、为什么给这条 */
    note: z.string().trim().max(255).optional(),
  })
  .refine(input => input.expiresIn !== 'custom' || typeof input.customDays === 'number', {
    message: '选择自定义有效期时必须给 customDays',
    path: ['customDays'],
  })

export type ShareCreateDto = z.infer<typeof shareCreateSchema>
