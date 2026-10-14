import type { FormSegmentSchema } from '@rs/common'

/**
 * 创建页的**字段表**（schema 驱动表单的数据描述）。
 *
 * 与 web 的 `resume-editor-schemas.ts` **不共用同一份数据**：那份面向 `ResumeContent`
 * （`{ profile, highlights, skills }`），本份面向**创建输入契约**（`ResumeDocument` 的
 * `sections[]`，能力键名是 `capabilities`）——两套结构不同，强行共用会让类型互相拉扯
 * （结论与理由见 `ad3a0a9` 与 `dao/tasks/DAO-030`）。共用的部分是**渲染**：
 * `packages/ui` 的 `MySchemaForm` / `MySchemaFieldInput`，以及 `@rs/common` 的字段描述类型。
 *
 * ⚠️ 表单里的路径对应的是**编辑态模型** `ResumeCreateForm`（见 `utils/resume-create-form.ts`），
 * 不是契约本身。两处刻意的偏差：
 * 1. 日期用 `period` 文本（契约要 `date: { mode: 'custom', text }`）——
 *    结构化日期需要 start / end / isCurrent 三个控件，现有字段类型表达不了，
 *    硬塞会做出半截的数据；文本模式契约本身支持，后续再扩表单能力；
 * 2. 数组型文本（成果 / 技术栈 / 自我评价）用 `tags` 收 `string[]`，
 *    提交时再包成契约的 `[{ id, text }]`。
 */

/** 基本信息：姓名必填，其余可空 */
export const profileSegments: FormSegmentSchema[] = [
  {
    mode: 'fields',
    label: '基础信息',
    fields: [
      { path: 'profile.name', label: '姓名（必填）', type: 'text', placeholder: '真实姓名或常用称呼' },
      { path: 'profile.headline', label: '定位 / 方向', type: 'text', placeholder: '如：全栈开发 / 前端方向' },
      {
        path: 'profile.summary',
        label: '一句话简介',
        type: 'textarea',
        wide: true,
        placeholder: '两三句话说清你的经验、方向与特点',
      },
      { path: 'profile.avatarText', label: '头像文字', type: 'text', placeholder: '不填则用姓名首字' },
      { path: 'profile.availability', label: '当前状态', type: 'text', placeholder: '如：在职看机会' },
    ],
  },
  {
    mode: 'list',
    label: '联系方式',
    listPath: 'profile.infoItems',
    titleKey: 'label',
    blank: { id: '', kind: 'email', label: '', value: '', icon: '' },
    fields: [
      { key: 'label', label: '名称', type: 'text', placeholder: '如：邮箱' },
      { key: 'kind', label: '类型键', type: 'text', placeholder: 'email / phone / location / years / education' },
      { key: 'value', label: '内容', type: 'text', placeholder: '如：me@example.com' },
      { key: 'icon', label: '图标名', type: 'text', placeholder: '如 i-lucide-mail（可留空）' },
    ],
  },
  {
    mode: 'list',
    label: '链接',
    listPath: 'profile.links',
    titleKey: 'label',
    blank: { id: '', label: '', url: '', icon: '' },
    fields: [
      { key: 'label', label: '名称', type: 'text', placeholder: '如：GitHub' },
      { key: 'url', label: '链接（http/https，必填）', type: 'text', placeholder: 'https://github.com/you' },
      { key: 'icon', label: '图标名', type: 'text', placeholder: '如 ri:github-fill（可留空）' },
    ],
  },
]

/** 核心竞争力 */
export const highlightsSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'highlights.items',
    titleKey: 'title',
    blank: { id: '', title: '', description: '' },
    fields: [
      { key: 'title', label: '标题（必填）', type: 'text' },
      { key: 'description', label: '说明', type: 'textarea', wide: true },
    ],
  },
]

/** 教育经历 */
export const educationSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'education.items',
    titleKey: 'school',
    blank: { id: '', school: '', period: '', degree: '', major: '' },
    fields: [
      { key: 'school', label: '学校（必填）', type: 'text' },
      { key: 'period', label: '时间', type: 'text', placeholder: '如：2017.09 - 2021.06' },
      { key: 'degree', label: '学位', type: 'text', placeholder: '如：本科' },
      { key: 'major', label: '专业', type: 'text' },
    ],
  },
]

/** 工作经历 */
export const experienceSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'experience.items',
    titleKey: 'company',
    blank: {
      id: '',
      company: '',
      period: '',
      role: '',
      domain: '',
      overview: '',
      achievements: [],
      tech: [],
    },
    fields: [
      { key: 'company', label: '公司（必填）', type: 'text' },
      { key: 'period', label: '时间', type: 'text', placeholder: '如：2021.07 - 至今' },
      { key: 'role', label: '职位', type: 'text' },
      { key: 'domain', label: '行业 / 类型', type: 'text' },
      { key: 'overview', label: '工作概述', type: 'textarea', wide: true },
      { key: 'achievements', label: '主要成果（回车添加）', type: 'tags', wide: true },
      { key: 'tech', label: '技术栈（回车添加）', type: 'tags', wide: true },
    ],
  },
]

/** 项目经历 */
export const projectsSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'projects.items',
    titleKey: 'name',
    blank: {
      id: '',
      name: '',
      period: '',
      role: '',
      overview: '',
      features: [],
      highlights: [],
      tech: [],
    },
    fields: [
      { key: 'name', label: '项目名（必填）', type: 'text' },
      { key: 'period', label: '时间', type: 'text' },
      { key: 'role', label: '角色', type: 'text' },
      { key: 'overview', label: '项目概述', type: 'textarea', wide: true },
      { key: 'features', label: '功能点（回车添加）', type: 'tags', wide: true },
      { key: 'highlights', label: '亮点（回车添加）', type: 'tags', wide: true },
      { key: 'tech', label: '技术栈（回车添加）', type: 'tags', wide: true },
    ],
  },
]

/**
 * 个人能力。
 *
 * 本期只编辑**分组**（名称 / 说明 / 条目名），评分量尺固定 5 分、维度留空 ——
 * 评分与雷达图那些细节归 web 的草稿工作台（DAO-028 已实现）。
 * 创建阶段先把"有哪些能力"记下来，比要求用户在这里打完分更符合稀疏输入的本意。
 */
export const capabilitiesSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'capabilities.groups',
    titleKey: 'title',
    blank: { id: '', title: '', summary: '', items: [] },
    fields: [
      { key: 'title', label: '分组名（必填）', type: 'text', placeholder: '如：工程能力' },
      { key: 'summary', label: '分组说明', type: 'text', wide: true },
      { key: 'items', label: '能力条目（回车添加）', type: 'tags', wide: true },
    ],
  },
]

/** 自我评价：契约是 `[{ id, text }]`，这里用一段一行文本收，提交时包成条目 */
export const evaluationsSegments: FormSegmentSchema[] = [
  {
    mode: 'fields',
    fields: [{ path: 'evaluations.lines', label: '评价（回车添加一条）', type: 'tags', wide: true }],
  },
]

/** 一个区块在创建页上的呈现元信息 */
export interface ResumeCreateSection {
  key: string
  label: string
  icon: string
  /** 卡片头上的补充说明：这一块"填什么、能不能空" */
  hint: string
  segments: FormSegmentSchema[]
}

/**
 * 七个区块的组织顺序：**与契约的模块顺序一致**（基本信息先行），
 * 但顺序只影响表单观感 —— 提交后文档顺序由服务端补全时按契约规则重建。
 */
export const resumeCreateSections: ResumeCreateSection[] = [
  {
    key: 'profile',
    label: '基本信息',
    icon: 'i-lucide-user-round',
    hint: '姓名必填，其余可以留空',
    segments: profileSegments,
  },
  {
    key: 'highlights',
    label: '核心竞争力',
    icon: 'i-lucide-sparkle',
    hint: '可空',
    segments: highlightsSegments,
  },
  {
    key: 'education',
    label: '教育经历',
    icon: 'i-lucide-graduation-cap',
    hint: '可空',
    segments: educationSegments,
  },
  {
    key: 'experience',
    label: '工作经历',
    icon: 'i-lucide-briefcase',
    hint: '可空',
    segments: experienceSegments,
  },
  {
    key: 'projects',
    label: '项目经历',
    icon: 'i-lucide-folder-code',
    hint: '可空',
    segments: projectsSegments,
  },
  {
    key: 'capabilities',
    label: '个人能力',
    icon: 'i-lucide-radar',
    hint: '先记分组与条目名，评分在编辑页补',
    segments: capabilitiesSegments,
  },
  {
    key: 'evaluations',
    label: '自我评价',
    icon: 'i-lucide-message-square-quote',
    hint: '可空',
    segments: evaluationsSegments,
  },
]
