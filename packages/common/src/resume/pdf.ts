import { z } from 'zod'
import { resumePdfConfigSchema } from './pdf-config.js'

/**
 * PDF 导出只接收资源身份与预览摘要；不接受 HTML、任意 URL 或长期令牌。
 * 摘要覆盖 content 与 display，避免只校验 revision 时漏掉独立的展示配置写入。
 */
export const resumePdfExportSchema = z.strictObject({
  source: z.enum(['published', 'draft']),
  /** 本次临时纸面选项，仅影响此次导出，不修改作者文档。 */
  pdfConfig: resumePdfConfigSchema.optional(),
  documentHash: z.string().regex(/^[a-f0-9]{64}$/),
})
export type ResumePdfExportDto = z.infer<typeof resumePdfExportSchema>

/** 稳定 JSON：忽略对象字段顺序，保留数组顺序；仅用于已校验的 JSON 文档。 */
export function canonicalResumeJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalResumeJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .filter(key => record[key] !== undefined)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalResumeJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}
