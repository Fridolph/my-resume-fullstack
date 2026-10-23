import { z } from 'zod'

/**
 * 链接元信息（`label` / `note`）。
 *
 * 只能改这两项：`token` / `expiresAt` / `allowPdf` 都是**授权语义**的一部分，
 * 改它们等于换了一条链接 —— 那应当是"新建一条 + 撤销旧的"，而不是原地改。
 * 有效期如需延长，也走"新建"，这样旧链接的记录与事件仍归旧链接，不会张冠李戴。
 */
export const shareUpdateSchema = z
  .strictObject({
    label: z.string().trim().max(64).nullable().optional(),
    note: z.string().trim().max(255).nullable().optional(),
  })
  .refine(input => input.label !== undefined || input.note !== undefined, {
    message: '至少要改一项',
  })

export type ShareUpdateDto = z.infer<typeof shareUpdateSchema>
