/**
 * 完整简历文档的共享运行时契约。
 *
 * `content` 保存用户实际填写的模块化内容，`display` 保存排序、显隐、
 * 布局和主题等展示配置。两者分离后，同一份正文可以在不同展示模式中
 * 重排或隐藏，而不需要修改简历事实本身。所有外部输入都必须经过这里的
 * Zod 校验，不能只依赖编译期 TypeScript 类型。
 */
import { z } from 'zod'
import {
  capabilityDataSchema,
  capabilityViewSchema,
  resumeDescriptionSchema,
  resumeIdSchema,
  resumeLinkSchema,
  resumeNameSchema,
} from './capabilities.js'

/** 展示标题、标签等短文本的统一上限。 */
const text = z.string().max(500)

/** 允许的图标标识格式，避免把任意代码作为图标字段写入文档。 */
const icon = z
  .string()
  .max(100)
  .regex(/^[A-Za-z0-9:_-]*$/)
/** 允许空值、HTTP(S) 外链或站内绝对路径的图片地址。 */
const imageUrl = z.union([
  z.literal(''),
  resumeLinkSchema,
  z
    .string()
    .max(2048)
    .regex(/^\/(?!\/)[A-Za-z0-9/_?&=.%#-]*$/),
])
/** 带稳定 ID 的通用文字列表项，用于成就、技术栈和亮点。 */
const textItem = z.strictObject({ id: resumeIdSchema, text: resumeDescriptionSchema })

/** 通用文字列表的数量上限。 */
const textItems = z.array(textItem).max(50)

/** 每个简历模块都具备的实例身份与编辑元数据。 */
const base = {
  id: resumeIdSchema,
  title: resumeNameSchema,
  description: resumeDescriptionSchema.optional(),
  icon: icon.optional(),
}
/** 结构化日期使用的 YYYY-MM 格式。 */
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

/**
 * 日期的两种互斥表达：用户可直接填写自定义文本，也可使用可比较的结构化日期。
 * 结构化模式下，`isCurrent` 与 `end` 必须保持一致，且结束时间不能早于开始时间。
 *
 * @remarks
 * custom 模式只有 mode 与 text，文本最多 500 且允许为空，不推断时间先后。
 * structured 模式必填 start、end、isCurrent：start/end 使用 YYYY-MM；至今时
 * end 必须为 null，非至今时必须有结束月份，允许开始与结束为同月。
 * 分支都拒绝未知字段，不允许混用自定义文本与结构化字段。
 */
export const resumeDateSchema = z
  .discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('custom'), text }),
    z.strictObject({ mode: z.literal('structured'), start: month, end: month.nullable(), isCurrent: z.boolean() }),
  ])
  .superRefine((date, context) => {
    if (date.mode !== 'structured') return
    if (date.isCurrent ? date.end !== null : date.end === null || date.start > date.end) {
      context.addIssue({ code: 'custom', message: '日期顺序或至今标记不合法' })
    }
  })

/**
 * 基本信息模块的头图字段。
 *
 * 独立成具名 schema，是为了让「创建输入的稀疏 profile」能复用同一形状（用 `.partial()` 放宽），
 * 而不必把四个字段再抄一遍 —— 抄写就会漂移。
 */
const profileHeroSchema = z.strictObject({
  frontImageUrl: imageUrl,
  backImageUrl: imageUrl,
  linkUrl: imageUrl,
  slogans: textItems,
})

/** 基本信息模块的正文字段。 */
const profileData = z.strictObject({
  name: text,
  headline: text,
  summary: resumeDescriptionSchema,
  avatarText: text.optional(),
  availability: text.optional(),
  hero: profileHeroSchema,
  infoItems: z
    .array(z.strictObject({ id: resumeIdSchema, kind: z.string().min(1).max(80), label: text, value: text, icon }))
    .max(30),
  links: z
    .array(z.strictObject({ id: resumeIdSchema, label: text, url: resumeLinkSchema, icon: icon.optional() }))
    .max(30),
  interests: z
    .array(
      z.strictObject({
        id: resumeIdSchema,
        label: text,
        icon: icon.optional(),
        description: text.optional(),
        images: z
          .array(
            z.strictObject({
              id: resumeIdSchema,
              url: imageUrl,
              href: resumeLinkSchema.optional(),
              title: text.optional(),
              alt: text.optional(),
            }),
          )
          .max(30),
      }),
    )
    .max(30),
  stats: z.array(z.strictObject({ id: resumeIdSchema, label: text, value: text, hint: text.optional() })).max(30),
  gallery: z.array(z.strictObject({ id: resumeIdSchema, url: imageUrl, alt: text.optional() })).max(30),
})

/**
 * 简历模块实例的联合契约。
 *
 * `type` 是固定的程序识别键；`id`、`title`、`description` 和 `data` 属于
 * 当前模块实例。使用 discriminated union 后，读取模块数据时可以根据 type
 * 获得对应字段，同时拒绝把另一种模块的数据混入当前模块。
 *
 * @remarks
 * 支持 profile、highlights、education、experience、projects、capabilities、
 * evaluations；同一类型可有多实例，例如两组 projects。profile 的单例限制
 * 在完整文档中处理，不在单模块 schema 中处理。
 * 模块 id、title、type、data 必填，description、icon 可省略；条目数组的顺序
 * 表示模块内部内容顺序，模块间顺序由 display.sections.order 表示。
 */
export const resumeSectionSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...base, type: z.literal('profile'), data: profileData }),
  z.strictObject({
    ...base,
    type: z.literal('highlights'),
    data: z.strictObject({
      items: z.array(z.strictObject({ id: resumeIdSchema, title: text, description: resumeDescriptionSchema })).max(50),
    }),
  }),
  z.strictObject({
    ...base,
    type: z.literal('education'),
    data: z.strictObject({
      items: z
        .array(
          z.strictObject({
            id: resumeIdSchema,
            school: text,
            date: resumeDateSchema,
            degree: text,
            major: text.optional(),
          }),
        )
        .max(50),
    }),
  }),
  z.strictObject({
    ...base,
    type: z.literal('experience'),
    data: z.strictObject({
      items: z
        .array(
          z.strictObject({
            id: resumeIdSchema,
            company: text,
            date: resumeDateSchema,
            role: text,
            domain: text.optional(),
            overview: resumeDescriptionSchema.optional(),
            achievements: textItems,
            tech: textItems,
          }),
        )
        .max(50),
    }),
  }),
  z.strictObject({
    ...base,
    type: z.literal('projects'),
    data: z.strictObject({
      items: z
        .array(
          z.strictObject({
            id: resumeIdSchema,
            name: text,
            date: resumeDateSchema,
            role: text,
            overview: resumeDescriptionSchema.optional(),
            features: textItems,
            highlights: textItems,
            tech: textItems,
          }),
        )
        .max(50),
    }),
  }),
  z.strictObject({ ...base, type: z.literal('capabilities'), data: capabilityDataSchema }),
  z.strictObject({ ...base, type: z.literal('evaluations'), data: z.strictObject({ items: textItems }) }),
])

/** 六位十六进制颜色值。 */
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)

/** 一套展示主题颜色。 */
const palette = z.strictObject({
  primary: color,
  gradientFrom: color,
  gradientTo: color,
  surface: color,
  text: color,
  muted: color,
  border: color,
  chipBg: color,
  chipText: color,
})

/**
 * 展示配置的完整形状。
 *
 * 独立成具名 schema，供完整文档与「创建输入的稀疏 display」共用：
 * 后者用 `.partial()` 让七块都能省略，再由补全函数填默认值。
 */
const displaySchema = z.strictObject({
  brand: z.strictObject({
    logoText: text.optional(),
    logoUrl: imageUrl.optional(),
    title: text.optional(),
    description: text.optional(),
  }),
  layout: z.strictObject({
    mode: z.enum(['single', 'split', 'threeColumn']),
    splitSide: z.enum(['left', 'right']),
    stickySide: z.boolean(),
    sideWidth: z.enum(['compact', 'wide']),
  }),
  sections: z.strictObject({
    order: z.array(resumeIdSchema).max(30),
    slot: z.record(resumeIdSchema, z.enum(['side', 'main', 'rail'])),
    hidden: z.array(resumeIdSchema).max(30),
    overrides: z.record(resumeIdSchema, z.strictObject({ capabilities: capabilityViewSchema.optional() })),
  }),
  options: z.strictObject({
    showPhone: z.boolean(),
    showEmail: z.boolean(),
    showLocation: z.boolean(),
    showYears: z.boolean(),
    showTechStack: z.boolean(),
    showAchievements: z.boolean(),
  }),
  theme: z.strictObject({ id: text, label: text, mode: z.enum(['light', 'dark']), light: palette, dark: palette }),
  background: z.strictObject({
    type: z.enum(['plain', 'texture', 'image']),
    textureId: text,
    image: z.strictObject({
      url: imageUrl,
      fit: z.enum(['cover', 'contain']),
      overlay: z.number().min(0).max(100),
      blur: z.number().min(0).max(20),
    }),
  }),
  style: z.strictObject({ id: z.enum(['minimal', 'standard', 'pro']) }),
})

/**
 * 一份完整的 V1 简历文档。
 *
 * 除基础字段校验外，`superRefine` 还验证 content 内所有 ID 的文档内唯一性、模块排序
 * 是否完整、展示配置是否引用真实模块、基本信息模块是否恰好一个，以及
 * UTF-8 序列化后的文档大小是否在 100 KiB 内。这些规则跨越多个字段，
 * 无法仅靠单字段 schema 表达。
 *
 * @remarks
 * schemaVersion 只接受 1，不自动识别或迁移旧结构。content.sections 为 1～30 项，
 * 必须恰好包含一个 profile；footer 独立于自我评价模块，note 可省略。
 * display 保存品牌、布局、模块配置、显示选项、主题、背景和展示风格。
 * order 必须完整包含所有模块且无重复，包含隐藏模块；hidden 不可重复。
 * slot 与 overrides 可只配置部分模块，但键必须引用真实模块。
 * 能力覆盖只可用于 capabilities，维度引用必须来自对应模块且无重复。
 * 大小限制按解析后文档的 JSON.stringify 结果计算 UTF-8 字节数，100 KiB 可接受。
 * strictObject 拒绝未知字段；该 schema 不保证颜色可读性、个人信息真实性、
 * 身份权限或保存版本正确，相关职责留给 UI 与后端服务。
 */
export const resumeDocumentSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    content: z.strictObject({
      sections: z.array(resumeSectionSchema).min(1).max(30),
      footer: z.strictObject({ note: resumeDescriptionSchema.optional() }),
    }),
    display: displaySchema,
  })
  .superRefine((document, context) => {
    const ids = new Set<string>()
    const collectIds = (value: unknown, path: (string | number)[]) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => collectIds(item, [...path, index]))
        return
      }
      if (!value || typeof value !== 'object') return
      for (const [key, item] of Object.entries(value)) {
        if (key === 'id' && typeof item === 'string') {
          if (ids.has(item)) context.addIssue({ code: 'custom', path: [...path, key], message: '文档 ID 重复' })
          ids.add(item)
        } else collectIds(item, [...path, key])
      }
    }
    collectIds(document.content, ['content'])
    const sections = document.content.sections
    const sectionIds = new Set(sections.map(section => section.id))
    const layout = document.display.sections
    if (
      layout.order.length !== sectionIds.size ||
      new Set(layout.order).size !== sectionIds.size ||
      layout.order.some(id => !sectionIds.has(id))
    ) {
      context.addIssue({ code: 'custom', path: ['display', 'sections', 'order'], message: '模块顺序必须完整且无重复' })
    }
    if (
      new Set(layout.hidden).size !== layout.hidden.length ||
      [...layout.hidden, ...Object.keys(layout.slot), ...Object.keys(layout.overrides)].some(id => !sectionIds.has(id))
    ) {
      context.addIssue({ code: 'custom', path: ['display', 'sections'], message: '显隐或栏位引用无效' })
    }
    if (sections.filter(section => section.type === 'profile').length !== 1) {
      context.addIssue({ code: 'custom', path: ['content', 'sections'], message: '必须恰有一个基本信息模块' })
    }
    sections.forEach(section => {
      const view = layout.overrides[section.id]?.capabilities
      if (!view) return
      if (
        section.type !== 'capabilities' ||
        new Set(view.dimensionIds).size !== view.dimensionIds.length ||
        view.dimensionIds.some(id => !section.data.dimensions.some(dimension => dimension.id === id))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['display', 'sections', 'overrides', section.id],
          message: '能力视图引用无效',
        })
      }
    })
    if (new TextEncoder().encode(JSON.stringify(document)).length > 100 * 1024) {
      context.addIssue({ code: 'custom', message: '简历文档超过 100 KiB' })
    }
  })

/* ──────────────────────────────────────────────────────────────────────────
 * 创建输入（稀疏）与默认补全
 *
 * 目标：允许调用方只给很少的内容（例如「姓名 + 一段经历」），由服务端补全成一份
 * 合法的完整文档再入库。设计见 docs/dev/07_简历系统_最小创建输入与默认补全.md。
 *
 * ⚠️ 两条必须守住的边界：
 * 1. **超集** —— 稀疏 schema 必须接受「完整文档」（含 schemaVersion 与完整 display），
 *    否则现有 web 客户端（仍发完整 document）会直接 400；
 * 2. **跨字段规则** —— 补全产物仍要过 resumeDocumentSchema 的 superRefine
 *    （order 完整、ID 唯一、恰一个 profile），所以 order 在补全时按最终模块顺序重建。
 * ────────────────────────────────────────────────────────────────────────── */

/** 稀疏 profile：顶层字段全部可选，只有 name 必填；hero 内部同样放宽。 */
const sparseProfileData = profileData.partial().extend({
  name: text,
  hero: profileHeroSchema.partial().optional(),
})

/** 稀疏 profile 模块：id / title 可省略（由补全生成），type 固定为 profile。 */
const sparseProfileSection = z.strictObject({
  id: resumeIdSchema.optional(),
  title: resumeNameSchema.optional(),
  description: resumeDescriptionSchema.optional(),
  icon: icon.optional(),
  type: z.literal('profile'),
  data: sparseProfileData,
})

/**
 * 创建输入里的一个模块。
 *
 * profile 走稀疏版（可省略 id / title / 内部字段），其余六类沿用完整契约 ——
 * 「半截模块」属边缘用法，需要时再放宽。
 */
const sparseSectionSchema = z.union([sparseProfileSection, resumeSectionSchema])

/**
 * 创建一份简历草稿的稀疏输入。
 *
 * ⚠️ 与旧的 CreateResume.document 相比：
 * - `schemaVersion` 变为**可选且被忽略** —— 留着它是为了让「完整文档」也能通过（超集）；
 *   真正的版本号由补全函数固定写 1，调用方不必也不应自己决定（类比登录后接口自动带 token）。
 * - `display` 整块可省略；`content.footer` 可省略。
 * - `content.sections` 至少 1 项，且必须**恰含一个 profile**。
 */
export const resumeDraftInputSchema = z
  .strictObject({
    schemaVersion: z.literal(1).optional(),
    content: z.strictObject({
      sections: z.array(sparseSectionSchema).min(1).max(30),
      footer: z.strictObject({ note: resumeDescriptionSchema.optional() }).optional(),
    }),
    display: displaySchema.partial().optional(),
  })
  .superRefine((input, context) => {
    const profileCount = input.content.sections.filter(section => section.type === 'profile').length
    if (profileCount !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['content', 'sections'],
        message: '必须恰有一个基本信息模块（type: profile）',
      })
    }
  })

/** 从稀疏创建输入推导的编译期类型。 */
export type ResumeDraftInput = z.infer<typeof resumeDraftInputSchema>

/** 模块默认标题，与 web 侧 resume-document.ts 的 titles 表保持一致。 */
const SECTION_TITLES = {
  profile: '基本信息',
  highlights: '核心竞争力',
  education: '教育经历',
  experience: '工作经历',
  projects: '项目经历',
  capabilities: '专业技能',
  evaluations: '自我评价',
} as const

/** 补全时要保证存在的六个可选模块（数组顺序即补齐顺序）。 */
const OPTIONAL_SECTION_TYPES = [
  'highlights',
  'education',
  'experience',
  'projects',
  'capabilities',
  'evaluations',
] as const

/** 默认配色，与 web 的 resumeThemePresets 首项（blue / 蓝色简约）一致。 */
const DEFAULT_THEME = {
  id: 'blue',
  label: '蓝色简约',
  mode: 'light' as const,
  light: {
    primary: '#1578d0',
    gradientFrom: '#1578d0',
    gradientTo: '#3ec064',
    surface: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    chipBg: '#f1f5f9',
    chipText: '#334155',
  },
  dark: {
    primary: '#60a5fa',
    gradientFrom: '#60a5fa',
    gradientTo: '#34d399',
    surface: '#111827',
    text: '#e5e7eb',
    muted: '#94a3b8',
    border: '#1f2937',
    chipBg: '#1f2937',
    chipText: '#e2e8f0',
  },
}

/** 默认展示开关：新建简历默认把信息都展示出来。 */
const DEFAULT_OPTIONS = {
  showPhone: true,
  showEmail: true,
  showLocation: true,
  showYears: true,
  showTechStack: true,
  showAchievements: true,
}

/**
 * 造一个「空数据」的可选模块。
 *
 * 空数组合法，但字段不能缺 —— 例如 capabilities 的 `ratingScale` 是必填对象，
 * 即使没有任何能力条目也必须给出（量尺下限固定 0，上限取最小的 5）。
 */
function emptySection(type: (typeof OPTIONAL_SECTION_TYPES)[number], id: string, title: string): ResumeSection {
  switch (type) {
    case 'highlights':
    case 'education':
    case 'experience':
    case 'projects':
    case 'evaluations':
      return { id, type, title, data: { items: [] } }
    case 'capabilities':
      return { id, type, title, data: { groups: [], ratingScale: { min: 0, max: 5, basis: '' }, dimensions: [] } }
  }
}

/**
 * 把稀疏创建输入补全为一份合法的完整 V1 文档。
 *
 * 行为：
 * - **幂等**：输入已是完整文档时，保留其 id 与 display，只做归一（schemaVersion 固定 1）——
 *   因为按「每次调用都重新生成 id」实现会把 order / overrides 的引用一起改掉，等于重写文档；
 * - **补齐**：六类可选模块缺失即补成空模块，让用户一进编辑页就看到全部模块位；
 * - **兜底校验**：产物仍走 resumeDocumentSchema.parse，任何规则漏掉都会当场失败而不是写进库。
 *
 * @throws 输入缺少 profile 时抛错（正常由 resumeDraftInputSchema 提前拦下）。
 */
export function buildResumeDocument(input: ResumeDraftInput): ResumeDocument {
  // 先收集用户已给的 ID：契约要求文档内唯一，生成新 ID 时据此查重
  const usedIds = new Set<string>()
  const collectIds = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(collectIds)
      return
    }
    if (!value || typeof value !== 'object') return
    for (const [key, item] of Object.entries(value)) {
      if (key === 'id' && typeof item === 'string') usedIds.add(item)
      else collectIds(item)
    }
  }
  collectIds(input.content.sections)

  // uuid 实际不会撞，但仍显式查重，避免「文档内唯一」只停留在注释上
  const nextId = (): string => {
    let id = globalThis.crypto.randomUUID()
    while (usedIds.has(id)) id = globalThis.crypto.randomUUID()
    usedIds.add(id)
    return id
  }

  const rawProfile = input.content.sections.find(section => section.type === 'profile')
  if (!rawProfile) throw new Error('缺少基本信息模块（type: profile），无法补全')
  const sparseProfile = rawProfile.data

  const profileSection: ResumeSection = {
    id: rawProfile.id ?? nextId(),
    title: rawProfile.title ?? SECTION_TITLES.profile,
    ...(rawProfile.description === undefined ? {} : { description: rawProfile.description }),
    ...(rawProfile.icon === undefined ? {} : { icon: rawProfile.icon }),
    type: 'profile',
    data: {
      name: sparseProfile.name,
      headline: sparseProfile.headline ?? '',
      summary: sparseProfile.summary ?? '',
      ...(sparseProfile.avatarText === undefined ? {} : { avatarText: sparseProfile.avatarText }),
      ...(sparseProfile.availability === undefined ? {} : { availability: sparseProfile.availability }),
      hero: {
        frontImageUrl: sparseProfile.hero?.frontImageUrl ?? '',
        backImageUrl: sparseProfile.hero?.backImageUrl ?? '',
        linkUrl: sparseProfile.hero?.linkUrl ?? '',
        slogans: sparseProfile.hero?.slogans ?? [],
      },
      infoItems: sparseProfile.infoItems ?? [],
      links: sparseProfile.links ?? [],
      interests: sparseProfile.interests ?? [],
      stats: sparseProfile.stats ?? [],
      gallery: sparseProfile.gallery ?? [],
    },
  }

  // 其余已给模块原样保留（走完整契约，id / title 必填，无需补）
  const provided = input.content.sections.filter(section => section.type !== 'profile')

  const sections: ResumeSection[] = [profileSection, ...provided]
  for (const type of OPTIONAL_SECTION_TYPES) {
    if (sections.some(section => section.type === type)) continue
    sections.push(emptySection(type, nextId(), SECTION_TITLES[type]))
  }

  const display = input.display ?? {}
  return resumeDocumentSchema.parse({
    schemaVersion: 1,
    content: { sections, footer: input.content.footer ?? {} },
    display: {
      brand: display.brand ?? {},
      layout: display.layout ?? { mode: 'single', splitSide: 'left', stickySide: false, sideWidth: 'compact' },
      sections: {
        // ⚠️ 必须完整覆盖所有模块（含刚补齐的六个），否则 superRefine 报「模块顺序必须完整且无重复」
        order: sections.map(section => section.id),
        slot: display.sections?.slot ?? {},
        hidden: display.sections?.hidden ?? [],
        overrides: display.sections?.overrides ?? {},
      },
      options: display.options ?? DEFAULT_OPTIONS,
      theme: display.theme ?? DEFAULT_THEME,
      background: display.background ?? {
        type: 'plain',
        textureId: 'none',
        image: { url: '', fit: 'cover', overlay: 0, blur: 0 },
      },
      style: display.style ?? { id: 'minimal' },
    },
  })
}

/**
 * 创建一份简历及其初始草稿的请求体契约。
 *
 * name 是内部名称，locale 是 1～20 位字母、数字或连字符组成的语言标识，
 * 不做完整语言标签规范验证；**document 走稀疏输入**（resumeDraftInputSchema），
 * 由服务端用 buildResumeDocument 补全为完整 V1 文档后入库，schemaVersion 由服务端写 1。
 * 该稀疏输入是完整文档的**超集**，因此旧的完整文档请求仍然兼容。
 * 归属用户、简历主键与初始 revision 由后端确定，不允许客户端通过额外字段指定。
 * 两表创建是否原子成功由后端事务保证，不由 schema 保证。
 */
export const createResumeSchema = z.strictObject({
  name: resumeNameSchema,
  locale: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/),
  document: resumeDraftInputSchema,
})

/**
 * 保存当前草稿的请求体契约，提交整份文档而非局部补丁。
 *
 * expectedRevision 是前端读取的草稿并发版本，取 1～2147483646 的整数，
 * 为后端成功保存后递增版本留出空间。这里只校验形状与范围；后端仍需在
 * 同一原子更新中匹配版本，不匹配时返回冲突，避免两个窗口互相覆盖。
 * 此版本与文档 schemaVersion、未来发布版本及历史快照的身份不同。
 */
export const saveResumeDraftSchema = z.strictObject({
  expectedRevision: z.number().int().min(1).max(2147483646),
  document: resumeDocumentSchema,
})

/**
 * 从完整文档 schema 推导的编译期类型。
 *
 * 类型断言不会触发校验，外部 JSON 仍须通过 resumeDocumentSchema 解析。
 */
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>

/**
 * 从模块契约推导的联合类型。
 *
 * 通过 type 判断可以缩窄到对应 data 类型，避免能力字段用于项目模块。
 */
export type ResumeSection = z.infer<typeof resumeSectionSchema>

/**
 * 从 ResumeSection 联合类型中提取个人能力模块。
 *
 * 保留模块实例的 id、title 等基础字段，供能力编辑器与展示组件复用。
 */
export type CapabilitySection = Extract<ResumeSection, { type: 'capabilities' }>

/**
 * 从创建请求 schema 推导的 DTO 类型。
 *
 * 供前端调用与后端参数共享，运行时输入仍需创建请求 schema 校验。
 */
export type CreateResumeDto = z.infer<typeof createResumeSchema>

/**
 * 从保存请求 schema 推导的 DTO 类型。
 *
 * 包含完整文档和期望并发版本，不包含归属用户或发布状态。
 */
export type SaveResumeDraftDto = z.infer<typeof saveResumeDraftSchema>

/**
 * 读取或保存草稿接口返回给前端的响应类型。
 *
 * 此 interface 只有编译期约束，没有对应的整体响应运行时 schema。
 * resume 是简历元信息，document 是正文及展示配置；revision 表示当前并发版本，
 * 不说明历史内容已留存。时间使用可通过 JSON 传输的字符串。
 */
export interface ResumeDraftResponse {
  /** 简历稳定身份、内部名称与语言，区别于正文中的姓名。 */
  resume: { id: string; name: string; locale: string }
  /** 本次读取或成功保存后返回的草稿版本，用于下一次保存的 expectedRevision。 */
  revision: number
  /** 后端序列化的最近更新时间，不用于替代 revision 的并发检查。 */
  updatedAt: string
  /** 当前完整 V1 文档，不是 Prisma 模型或发布快照。 */
  document: ResumeDocument
}
