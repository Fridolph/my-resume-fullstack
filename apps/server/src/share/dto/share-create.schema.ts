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
    /** 预留的 AI 能力位：本轮只存不用 */
    allowAi: z.boolean().optional(),
    allowPdf: z.boolean().optional(),
  })
  .refine(input => input.expiresIn !== 'custom' || typeof input.customDays === 'number', {
    message: '选择自定义有效期时必须给 customDays',
    path: ['customDays'],
  })

export type ShareCreateDto = z.infer<typeof shareCreateSchema>
