import { displaySchema } from '@rs/common'
import { z } from 'zod'

/**
 * 「只改展示配置」的入参：**整体替换 `document.display`**。
 *
 * 传整块而不是 patch：展示配置是一个整体（主题 + 布局 + 背景 + 显隐），
 * 半块合并的语义要按字段定义、容易在新增字段时漏掉；整块替换只需要 schema 校验。
 *
 * 它与 `PUT /resume/:id/draft` 的分工：
 * - 那个改**内容**，用 `expectedRevision` 做乐观锁；
 * - 这个只改外观，**不推进 revision** —— 两个人一个在改内容、一个在调主题，
 *   不该因为"版本对不上"互相 409。
 */
export const resumeDisplayUpdateSchema = z.strictObject({
  display: displaySchema,
})

export type ResumeDisplayUpdateDto = z.infer<typeof resumeDisplayUpdateSchema>
