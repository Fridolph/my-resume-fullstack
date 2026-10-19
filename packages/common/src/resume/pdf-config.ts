import { z } from 'zod'

/** PDF 配置独立版本，文档仍兼容无 pdf 字段的历史 V1。 */
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/)
const ids = z
  .array(id)
  .max(30)
  .refine(values => new Set(values).size === values.length, '模块不可重复')
const edge = z.strictObject({
  enabled: z.boolean(),
  text: z
    .string()
    .max(100)
    .refine(value => !/[\r\n]/.test(value), '页眉页脚仅支持单行文字'),
  align: z.enum(['left', 'center', 'right']),
  hideFirstPage: z.boolean(),
  separator: z.boolean(),
})

/**
 * 纸面配置仅接受受控数值、颜色和纯文本，不允许任意 CSS/HTML。
 * 独立模块顺序可只列部分，新模块在渲染时补齐；隐藏字段不会删正文。
 */
export const resumePdfConfigSchema = z.strictObject({
  version: z.literal(1),
  sections: z.strictObject({ mode: z.enum(['followWeb', 'independent']), order: ids, hidden: ids }),
  fields: z.strictObject({
    interests: z.boolean(),
    stats: z.boolean(),
    profileSummary: z.boolean(),
    sectionDescriptions: z.boolean(),
    overviews: z.boolean(),
    capabilitySummaries: z.boolean(),
    ratings: z.boolean(),
    footerNote: z.boolean(),
  }),
  page: z.strictObject({
    marginTop: z.number().min(5).max(30),
    marginRight: z.number().min(5).max(30),
    marginBottom: z.number().min(5).max(30),
    marginLeft: z.number().min(5).max(30),
  }),
  typography: z.strictObject({
    fontSize: z.number().min(10).max(16),
    lineHeight: z.number().min(1.2).max(2),
    blockSpacing: z.number().min(2).max(16),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  header: edge,
  footer: edge,
})
export type ResumePdfConfig = z.infer<typeof resumePdfConfigSchema>

/** 每次返回新对象，避免多个简历共享可变默认引用。 */
export function defaultResumePdfConfig(): ResumePdfConfig {
  return {
    version: 1,
    sections: { mode: 'followWeb', order: [], hidden: [] },
    fields: {
      interests: true,
      stats: true,
      profileSummary: true,
      sectionDescriptions: true,
      overviews: true,
      capabilitySummaries: true,
      ratings: true,
      footerNote: true,
    },
    page: { marginTop: 14, marginRight: 15, marginBottom: 12, marginLeft: 15 },
    typography: { fontSize: 12, lineHeight: 1.65, blockSpacing: 8, primaryColor: '#334a64' },
    header: { enabled: false, text: '{name}', align: 'left', hideFirstPage: false, separator: true },
    footer: { enabled: true, text: '{name} · {page} / {pages}', align: 'right', hideFirstPage: false, separator: true },
  }
}

/** 公共预设不保存任何简历模块 ID；应用时保留目标简历的模块设置。 */
export function toResumePdfPreset(config: ResumePdfConfig): ResumePdfConfig {
  return { ...structuredClone(config), sections: { mode: 'followWeb', order: [], hidden: [] } }
}

/** 严格校验的写请求；null 表示此前没有独立配置，不能与默认对象混淆。 */
export const resumePdfConfigUpdateSchema = z.strictObject({
  config: resumePdfConfigSchema,
  expectedConfig: resumePdfConfigSchema.nullable(),
})
export type ResumePdfConfigUpdateDto = z.infer<typeof resumePdfConfigUpdateSchema>
export interface ResumePdfConfigResponse {
  config: ResumePdfConfig | null
}

/** 对目标简历校验实例引用；旧配置遗留的已删除模块在读取时忽略，保存时拒绝。 */
export function pdfConfigReferencesValid(config: ResumePdfConfig, sectionIds: readonly string[]): boolean {
  const existing = new Set(sectionIds)
  return [...config.sections.order, ...config.sections.hidden].every(value => existing.has(value))
}
