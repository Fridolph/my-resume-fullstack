import { z } from 'zod'

/**
 * 发布 / 取消发布的入参。
 *
 * 用 `strictObject` 而不是 `boolean` 裸值：**命名一个字段**让契约自解释
 * （`{ published: false }` 比 `false` 更难被误读），也给将来可能的
 * 「定时发布」「发布说明」留出扩展位而不必改请求形状。
 *
 * 不用 `z.coerce.boolean()`：它会把字符串 `"false"` 转成 `true`
 * （非空字符串即真），那是一个经典的静默错误。
 */
export const resumePublishSchema = z.strictObject({
  published: z.boolean(),
})

export type ResumePublishDto = z.infer<typeof resumePublishSchema>
