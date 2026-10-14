import type { CreateResumeDto, ResumeDraftInput } from '@rs/common'

/**
 * 创建页的**编辑态模型**与「编辑态 → 契约」的转换。
 *
 * 为什么不直接把表单绑到契约结构上：`MySchemaForm` 只能表达
 * 「一串标量字段」与「对象数组的字段」两层，而契约里还有
 * `date: { mode, start, end, isCurrent }`、`achievements: [{ id, text }]`
 * 这类嵌套。把 UI 硬凹成契约形状会做出半截控件（见 `config/resume-create-schemas.ts`
 * 顶部说明）。所以这里保留一层**显式的转换**：编辑态好填，契约侧由 `toCreateResumeDto` 保证合法。
 *
 * 转换遵循「**稀疏输入**」的语义（Issue #36）：只提交用户真的填了的模块与字段，
 * 其余由服务端 `buildResumeDocument` 补全成完整 V1 文档。
 */

/** 文档内元素 ID：v4 UUID 满足契约的 `[A-Za-z0-9_-]{1,100}`，文档内碰撞可忽略 */
function newId(): string {
  return globalThis.crypto.randomUUID()
}

function trimmed(value: string): string {
  return value.trim()
}

/** 只用于判断"用户到底填了没有" */
function notEmpty(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

/** `tags` 收的是 `string[]`，契约要 `[{ id, text }]`（契约的 text 允许为空，但空条目没有意义，过滤掉） */
function toTextItems(lines: string[]) {
  return lines
    .map(trimmed)
    .filter(Boolean)
    .map(text => ({ id: newId(), text }))
}

// ── 编辑态类型 ────────────────────────────────────────────────────────
// ⚠️ 这些**不是**契约类型：`period` 是文本（契约是 date 对象）、数组型文本是 `string[]`
// （契约是 textItems）。转换只发生在 `toCreateResumeDto`。

export type DraftContact = {
  id: string
  kind: string
  label: string
  value: string
  icon: string
}

export type DraftLink = {
  id: string
  label: string
  url: string
  icon: string
}

export type DraftHighlight = {
  id: string
  title: string
  description: string
}

export type DraftEducation = {
  id: string
  school: string
  period: string
  degree: string
  major: string
}

export type DraftExperience = {
  id: string
  company: string
  period: string
  role: string
  domain: string
  overview: string
  achievements: string[]
  tech: string[]
}

export type DraftProject = {
  id: string
  name: string
  period: string
  role: string
  overview: string
  features: string[]
  highlights: string[]
  tech: string[]
}

export type DraftCapabilityGroup = {
  id: string
  title: string
  summary: string
  items: string[]
}

/** 创建页的表单模型；`MySchemaForm` 直接就地修改它，路径与 `config/resume-create-schemas.ts` 一一对应 */
export type ResumeCreateForm = {
  /** 简历名（契约顶层字段，不进 document） */
  name: string
  /** 语言标识（契约要求 1～20 位字母、数字或连字符） */
  locale: string
  profile: {
    name: string
    headline: string
    summary: string
    avatarText: string
    availability: string
    infoItems: DraftContact[]
    links: DraftLink[]
  }
  highlights: { items: DraftHighlight[] }
  education: { items: DraftEducation[] }
  experience: { items: DraftExperience[] }
  projects: { items: DraftProject[] }
  capabilities: { groups: DraftCapabilityGroup[] }
  /** 自我评价：一行一条，提交时包成 `[{ id, text }]` */
  evaluations: { lines: string[] }
}

/** 空白表单。所有"新增一条"的入口都从空条目开始，不做预设内容（免得用户以为系统替他写了东西） */
export function createEmptyCreateForm(): ResumeCreateForm {
  return {
    name: '',
    locale: 'zh',
    profile: {
      name: '',
      headline: '',
      summary: '',
      avatarText: '',
      availability: '',
      infoItems: [],
      links: [],
    },
    highlights: { items: [] },
    education: { items: [] },
    experience: { items: [] },
    projects: { items: [] },
    capabilities: { groups: [] },
    evaluations: { lines: [] },
  }
}

/** 区块默认标题，与 `@rs/common` 的 `SECTION_TITLES` 保持一致（web 端编辑时可改） */
const SECTION_TITLES = {
  highlights: '核心竞争力',
  education: '教育经历',
  experience: '工作经历',
  projects: '项目经历',
  capabilities: '专业技能',
  evaluations: '自我评价',
} as const

/** 能力模块的默认评分量尺：下限固定 0，上限本期固定 5（评分细节归 web 的草稿工作台） */
const DEFAULT_RATING_SCALE = { min: 0, max: 5, basis: '' } as const

/**
 * 把编辑态转成 `POST /resume` 的请求体。
 *
 * 三条规则：
 * 1. **必填字段决定条目去留** —— 只点了「新增一项」却没填必填内容的条目直接丢弃，
 *    而不是提交一个必然 400 的半截对象（如没有 company 的工作经历）；
 * 2. **空的可选字段不写进 payload** —— 稀疏输入的本意是"只描述填过的部分"，
 *    塞满空字符串会让 payload 与用户的真实输入不成比例；
 * 3. **id 一律新生成** —— 创建是全新的文档，元素 id 没有历史可继承。
 *
 * @param form 编辑态表单（不会被修改）
 */
export function toCreateResumeDto(form: ResumeCreateForm): CreateResumeDto {
  const sections: ResumeDraftInput['content']['sections'] = []

  // ── 基本信息（契约里唯一必填的模块，只给填过的字段）────────────────
  const infoItems = form.profile.infoItems
    .filter(item => notEmpty(item.label) || notEmpty(item.value))
    .map(item => ({
      id: newId(),
      kind: notEmpty(item.kind) ? trimmed(item.kind) : 'contact',
      label: trimmed(item.label),
      value: trimmed(item.value),
      icon: trimmed(item.icon),
    }))

  // url 是必填且必须是合法 http(s)（`resumeLinkSchema`），空链接不能留在 payload 里
  const links = form.profile.links
    .filter(item => notEmpty(item.url))
    .map(item => ({
      id: newId(),
      label: trimmed(item.label),
      url: trimmed(item.url),
      ...(notEmpty(item.icon) ? { icon: trimmed(item.icon) } : {}),
    }))

  sections.push({
    type: 'profile',
    data: {
      name: trimmed(form.profile.name),
      ...(notEmpty(form.profile.headline) ? { headline: trimmed(form.profile.headline) } : {}),
      ...(notEmpty(form.profile.summary) ? { summary: trimmed(form.profile.summary) } : {}),
      ...(notEmpty(form.profile.avatarText) ? { avatarText: trimmed(form.profile.avatarText) } : {}),
      ...(notEmpty(form.profile.availability) ? { availability: trimmed(form.profile.availability) } : {}),
      ...(infoItems.length ? { infoItems } : {}),
      ...(links.length ? { links } : {}),
    },
  })

  // ── 核心竞争力 ───────────────────────────────────────────────────
  const highlights = form.highlights.items.filter(item => notEmpty(item.title))
  if (highlights.length) {
    sections.push({
      id: newId(),
      title: SECTION_TITLES.highlights,
      type: 'highlights',
      data: {
        items: highlights.map(item => ({
          id: newId(),
          title: trimmed(item.title),
          description: trimmed(item.description),
        })),
      },
    })
  }

  // ── 教育经历 ─────────────────────────────────────────────────────
  const education = form.education.items.filter(item => notEmpty(item.school))
  if (education.length) {
    sections.push({
      id: newId(),
      title: SECTION_TITLES.education,
      type: 'education',
      data: {
        items: education.map(item => ({
          id: newId(),
          school: trimmed(item.school),
          date: { mode: 'custom', text: trimmed(item.period) },
          degree: trimmed(item.degree),
          ...(notEmpty(item.major) ? { major: trimmed(item.major) } : {}),
        })),
      },
    })
  }

  // ── 工作经历 ─────────────────────────────────────────────────────
  const experience = form.experience.items.filter(item => notEmpty(item.company))
  if (experience.length) {
    sections.push({
      id: newId(),
      title: SECTION_TITLES.experience,
      type: 'experience',
      data: {
        items: experience.map(item => ({
          id: newId(),
          company: trimmed(item.company),
          date: { mode: 'custom', text: trimmed(item.period) },
          role: trimmed(item.role),
          ...(notEmpty(item.domain) ? { domain: trimmed(item.domain) } : {}),
          ...(notEmpty(item.overview) ? { overview: trimmed(item.overview) } : {}),
          achievements: toTextItems(item.achievements),
          tech: toTextItems(item.tech),
        })),
      },
    })
  }

  // ── 项目经历 ─────────────────────────────────────────────────────
  const projects = form.projects.items.filter(item => notEmpty(item.name))
  if (projects.length) {
    sections.push({
      id: newId(),
      title: SECTION_TITLES.projects,
      type: 'projects',
      data: {
        items: projects.map(item => ({
          id: newId(),
          name: trimmed(item.name),
          date: { mode: 'custom', text: trimmed(item.period) },
          role: trimmed(item.role),
          ...(notEmpty(item.overview) ? { overview: trimmed(item.overview) } : {}),
          features: toTextItems(item.features),
          highlights: toTextItems(item.highlights),
          tech: toTextItems(item.tech),
        })),
      },
    })
  }

  // ── 个人能力（只建分组；评分维度留空，后续在 web 工作台补）────────────
  const groups = form.capabilities.groups.filter(group => notEmpty(group.title))
  if (groups.length) {
    sections.push({
      id: newId(),
      title: SECTION_TITLES.capabilities,
      type: 'capabilities',
      data: {
        groups: groups.map(group => ({
          id: newId(),
          title: trimmed(group.title),
          ...(notEmpty(group.summary) ? { summary: trimmed(group.summary) } : {}),
          items: group.items
            .map(trimmed)
            .filter(Boolean)
            .map(name => ({ id: newId(), name, evidenceLinks: [] })),
        })),
        ratingScale: { ...DEFAULT_RATING_SCALE },
        dimensions: [],
      },
    })
  }

  // ── 自我评价 ─────────────────────────────────────────────────────
  const evaluations = form.evaluations.lines.map(trimmed).filter(Boolean)
  if (evaluations.length) {
    sections.push({
      id: newId(),
      title: SECTION_TITLES.evaluations,
      type: 'evaluations',
      data: { items: evaluations.map(text => ({ id: newId(), text })) },
    })
  }

  return {
    // 两个顶层的必填短字段给兜底值：契约要求非空（`resumeNameSchema` / locale 正则），
    // 与其让用户撞一个 400，不如用可读的默认名先建出来，名字随时能改。
    name: notEmpty(form.name) ? trimmed(form.name) : '未命名简历',
    locale: notEmpty(form.locale) ? trimmed(form.locale) : 'zh',
    document: { content: { sections } },
  }
}

/**
 * ZodError.issues 的结构子集 —— 只用结构化类型，避免 admin 直接依赖 zod 包。
 *
 * `path` 用 `PropertyKey`（含 symbol）而不是 `string | number`：zod v4 的 issue path
 * 就是这个类型，窄化会直接拒绝传入（TS2345）。symbol 段在下面的展示里统一 `String()` 化。
 */
interface IssueLike {
  path: readonly PropertyKey[]
  message: string
}

/**
 * 把契约校验的 issues 转成一段可读文本（取前几条）。
 *
 * 提交前自己跑一遍 `createResumeSchema.safeParse`，是为了把"半截条目"这类问题
 * **在请求之前**说清楚；否则用户只会看到后端一句「请求参数有误」。
 */
export function describeCreateIssues(issues: readonly IssueLike[]): string {
  const head = issues.slice(0, 3).map(issue => {
    const path = issue.path
      .map(part => String(part))
      .filter(part => part !== 'content' && part !== 'sections')
      .join('.')
    return path ? `${path}：${issue.message}` : issue.message
  })

  const more = issues.length > head.length ? `（另有 ${issues.length - head.length} 处）` : ''

  return `还有内容不符合契约：${head.join('；')}${more}`
}
