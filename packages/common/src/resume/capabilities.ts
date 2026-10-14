/**
 * 个人能力模块的共享运行时契约。
 *
 * 该文件同时被 Web 与 Server 使用：Zod schema 负责校验外部 JSON，
 * infer 得到的 TypeScript 类型负责在编译期约束内部代码。用户可以自定义
 * 分组、条目与评分维度，但字段职责、数量上限、ID 格式和跨字段引用规则
 * 由这里统一定义，避免前后端各自解释同一份简历文档。
 */
import { z } from 'zod'

/**
 * 校验模块、分组、条目和引用使用的稳定 ID。
 *
 * 长度为 1～100 个字符，允许 ASCII 字母、数字、下划线和连字符，
 * 兼容后端 cuid 主键和前端 randomUUID 生成的文档元素 ID。
 * 这里只检查格式；是否重复、被引用对象是否存在，由包含该 ID 的契约校验。
 * 同时用于简历路由参数和文档内部标识，只校验格式，不负责生成数据库主键。
 */
export const resumeIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/)

/**
 * 校验简历名称、标签和分组标题使用的非空短文本。
 *
 * parse 后返回去除首尾空白的字符串，长度为 1～80。
 * 标题内容由用户定义，不限定职业类别或预设名称。
 */
export const resumeNameSchema = z.string().trim().min(1).max(80)

/**
 * 校验能力描述及复用该契约的说明文本。
 *
 * 最多 200 个字符串长度单位，允许空字符串；字段是否可以省略由调用方
 * 的 optional 决定。本契约不做富文本清洗，也不限制为特定职业描述。
 */
export const resumeDescriptionSchema = z.string().max(200)

/**
 * 校验最多 1024 个字符串长度单位的 HTTP(S) 外部链接。
 *
 * 不接受 javascript 等协议。协议校验不保证目标站点可信，也不对地址
 * 发起网络请求；如果后端将来主动抓取该地址，还需要独立的请求安全边界。
 */
export const resumeLinkSchema = z
  .string()
  .max(1024)
  .pipe(z.url({ protocol: /^https?$/ }))

/**
 * 一个能力分组及其条目。
 *
 * `items` 允许为空，表示用户先建立分组、之后再补充内容；条目数量只
 * 受上限约束。`evidenceLinks` 用稳定 ID 标识，便于未来编辑、排序和差异对齐。
 *
 * @remarks
 * 分组必填 id、title、items，summary 可省略；每个条目必填 id、name、
 * evidenceLinks，description 可省略。items 最多 20 项，佐证链接最多 5 项。
 * 空数组合法，但省略这些必填数组不合法；strictObject 拒绝未声明字段。
 * ID 唯一性由完整文档契约统一检查，本分组 schema 只检查字段形状。
 */
export const capabilityGroupSchema = z.strictObject({
  id: resumeIdSchema,
  title: resumeNameSchema,
  summary: z.string().max(200).optional(),
  items: z
    .array(
      z.strictObject({
        id: resumeIdSchema,
        name: resumeNameSchema,
        description: resumeDescriptionSchema.optional(),
        evidenceLinks: z
          .array(
            z.strictObject({
              id: resumeIdSchema,
              label: resumeNameSchema,
              url: resumeLinkSchema,
            }),
          )
          .max(5),
      }),
    )
    .max(20),
})

/**
 * 个人能力模块的正文数据。
 *
 * `groups` 承载用户可编辑的文字内容，`dimensions` 是独立的评分轴，
 * 因此不是每个能力条目都必须有分数。`superRefine` 处理普通字段无法
 * 表达的关系：评分维度引用的分组必须存在，评分必须落在当前量尺内。
 *
 * @remarks
 * groups 和 dimensions 必填但允许空数组，各最多 20 项。量尺下限固定为 0，
 * 上限只能选择 5、10 或 100，basis 必填且允许空文本，最多 800。
 * score 必填，可为有限数字或 null；null 表示未评分，0 表示有效零分，
 * 小数评分允许。groupId 可省略；填写时即使格式正确，也必须引用本模块分组。
 * 校验错误带有具体字段路径，便于前端定位；该契约不负责身份、权限或并发控制。
 */
export const capabilityDataSchema = z
  .strictObject({
    groups: z.array(capabilityGroupSchema).max(20),
    ratingScale: z.strictObject({
      min: z.literal(0),
      max: z.union([z.literal(5), z.literal(10), z.literal(100)]),
      basis: z.string().max(800),
    }),
    dimensions: z
      .array(
        z.strictObject({
          id: resumeIdSchema,
          label: resumeNameSchema,
          groupId: resumeIdSchema.optional(),
          score: z.number().finite().nullable(),
          description: z.string().max(200).optional(),
        }),
      )
      .max(20),
  })
  .superRefine((data, context) => {
    const groupIds = new Set(data.groups.map(group => group.id))
    data.dimensions.forEach((dimension, index) => {
      if (dimension.groupId && !groupIds.has(dimension.groupId)) {
        context.addIssue({ code: 'custom', path: ['dimensions', index, 'groupId'], message: '能力组引用不存在' })
      }
      if (dimension.score !== null && (dimension.score < 0 || dimension.score > data.ratingScale.max)) {
        context.addIssue({ code: 'custom', path: ['dimensions', index, 'score'], message: '评分超出统一量尺' })
      }
    })
  })

/**
 * 校验能力模块的展示覆盖配置，不修改正文或实际评分。
 *
 * view 支持文字、条状图和雷达图；dimensionIds 按数组顺序选择展示维度，
 * 最多 20 项且可为空；previewItemCount 为 1～5 的整数。
 * 本契约只检查字段，维度 ID 的唯一性、归属和有效引用由完整文档契约检查。
 */
export const capabilityViewSchema = z.strictObject({
  view: z.enum(['text', 'bar', 'radar']),
  dimensionIds: z.array(resumeIdSchema).max(20),
  previewItemCount: z.number().int().min(1).max(5),
})

/**
 * 从能力数据 schema 推导的编译期类型。
 *
 * 类型标注不等于输入已校验；外部数据仍需调用 parse 或 safeParse。
 */
export type CapabilityData = z.infer<typeof capabilityDataSchema>

/**
 * 从分组 schema 推导的编译期类型。
 *
 * 前后端复用同一类型，避免手写接口与运行时规则发生漂移。
 */
export type CapabilityGroup = z.infer<typeof capabilityGroupSchema>

/**
 * 从能力数据数组元素提取的单个评分维度类型。
 *
 * score 为 null 时代表尚未评分，不应在展示或换算中自动当作零分。
 */
export type CapabilityDimension = CapabilityData['dimensions'][number]

/**
 * 从展示配置 schema 推导的编译期类型。
 *
 * 与 CapabilityData 分开，便于调整显示方式而不改变用户填写的能力事实。
 */
export type CapabilityView = z.infer<typeof capabilityViewSchema>

/**
 * 修改能力评分量尺，并显式选择如何处理已有分数。
 *
 * `convert` 按旧量尺与新量尺的比例换算；`clear` 清空所有已有评分，
 * 适合用户改变评分标准但不希望系统替用户推断新分数的场景。函数返回
 * 新对象，不修改传入的工作副本。
 *
 * @param data - 符合能力契约的原始数据，旧量尺必须为有效的非零上限。
 * @param max - 新量尺上限，可选 5、10 或 100，下限仍为 0。
 * @param mode - convert 按比例换算并四舍五入到两位小数；clear 将评分设为 null。
 * @returns 新的能力数据及量尺；原有 null 保持未评分，分组等未修改内容共享引用。
 * @remarks
 * 此函数不执行运行时校验、持久化或深拷贝。调用方应先验证输入，更新工作副本后
 * 再经过保存链路写入数据库；它也不会替用户修改 basis 中描述的评分依据。
 */
export function changeCapabilityScale(
  data: CapabilityData,
  max: 5 | 10 | 100,
  mode: 'convert' | 'clear',
): CapabilityData {
  const oldMax = data.ratingScale.max
  return {
    ...data,
    ratingScale: { ...data.ratingScale, max },
    dimensions: data.dimensions.map(dimension => ({
      ...dimension,
      score:
        dimension.score === null || mode === 'clear' ? null : Math.round((dimension.score / oldMax) * max * 100) / 100,
    })),
  }
}
