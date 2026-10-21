import type { FormSegmentSchema } from './form-schema.js'

/**
 * 编辑页的字段表（**面向契约文档本身**，与创建页那份不同）。
 *
 * 两处字段表的差别值得记住：
 * - 创建页的 root 是「编辑态模型」（`ResumeCreateForm`：日期是 `period` 文本、数组是 `string[]`），
 *   提交时再转成契约；
 * - 编辑页**直接就地编辑文档**（root 是某个模块的 `data`），所以字段形状必须就是契约形状 ——
 *   这样没出现在表单里的字段（`hero` / `interests` / `stats` / `gallery` / `display` / id / title…）
 *   会随对象一起原样保存，不会因为"编辑一次就丢一半"。
 *
 * ⚠️ **日期不在字段表里**：契约的 `date` 是判别联合（`custom` 文本 / `structured` 起止 + 至今），
 * 而现有字段类型只能表达标量、字符串数组与文字条目数组。硬塞一个文本框会把 `structured`
 * 写成非法形状，所以本轮**只读展示**（页面用 `MySchemaForm` 的 `list-item-extra` 插槽渲染摘要）。
 *
 * ⚠️ **为什么在 `@rs/common`**：这份字段表只有描述、没有一行 Vue 代码（顶部只有一个
 * `import type`），按三层归属判据（能脱离 Vue 运行 → `packages/common`）本就属于共享层。
 * 它原先放在 admin 的 layer 里，web 端要用就只能反向依赖 admin —— 那会把两个 app 绑在一起、
 * 单独构建也过不去。现在 admin 的 `config/resume-edit-schemas.ts` 只剩一行 re-export 保留调用面。
 */

/** 基本信息：root = profile 模块的 `data` */
export const profileEditSegments: FormSegmentSchema[] = [
  {
    mode: 'fields',
    label: '基础信息',
    fields: [
      { path: 'name', label: '姓名（必填）', type: 'text' },
      { path: 'headline', label: '定位 / 方向', type: 'text' },
      { path: 'summary', label: '一句话简介', type: 'textarea', wide: true },
      { path: 'avatarText', label: '头像文字', type: 'text' },
      { path: 'availability', label: '当前状态', type: 'text' },
    ],
  },
  {
    mode: 'list',
    label: '联系方式',
    listPath: 'infoItems',
    titleKey: 'label',
    blank: { id: '', kind: 'contact', label: '', value: '', icon: '' },
    fields: [
      { key: 'label', label: '名称', type: 'text' },
      { key: 'kind', label: '类型键', type: 'text', placeholder: 'email / phone / location / years / education' },
      { key: 'value', label: '内容', type: 'text' },
      { key: 'icon', label: '图标名', type: 'text', placeholder: '可留空' },
    ],
  },
  {
    mode: 'list',
    label: '链接',
    listPath: 'links',
    titleKey: 'label',
    blank: { id: '', label: '', url: '', icon: '' },
    fields: [
      { key: 'label', label: '名称', type: 'text' },
      { key: 'url', label: '链接（http/https）', type: 'text' },
      { key: 'icon', label: '图标名', type: 'text', placeholder: '可留空' },
    ],
  },
]

/** 核心竞争力：root = highlights 模块的 `data` */
export const highlightsEditSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'items',
    titleKey: 'title',
    blank: { id: '', title: '', description: '' },
    fields: [
      { key: 'title', label: '标题（必填）', type: 'text' },
      { key: 'description', label: '说明', type: 'textarea', wide: true },
    ],
  },
]

/** 教育经历：root = education 模块的 `data`；日期只读 */
export const educationEditSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'items',
    titleKey: 'school',
    blank: { id: '', school: '', date: { mode: 'custom', text: '' }, degree: '', major: '' },
    fields: [
      { key: 'school', label: '学校（必填）', type: 'text' },
      { key: 'date', label: '时间', type: 'date', wide: true },
      { key: 'degree', label: '学位', type: 'text' },
      { key: 'major', label: '专业', type: 'text' },
    ],
  },
]

/** 工作经历：root = experience 模块的 `data`；日期只读 */
export const experienceEditSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'items',
    titleKey: 'company',
    blank: {
      id: '',
      company: '',
      date: { mode: 'custom', text: '' },
      role: '',
      domain: '',
      overview: '',
      achievements: [],
      tech: [],
    },
    fields: [
      { key: 'company', label: '公司（必填）', type: 'text' },
      { key: 'date', label: '时间', type: 'date', wide: true },
      { key: 'role', label: '职位', type: 'text' },
      { key: 'domain', label: '行业 / 类型', type: 'text' },
      { key: 'overview', label: '工作概述', type: 'textarea', wide: true },
      { key: 'achievements', label: '主要成果（回车添加）', type: 'textItems', wide: true },
      { key: 'tech', label: '技术栈（回车添加）', type: 'textItems', wide: true },
    ],
  },
]

/** 项目经历：root = projects 模块的 `data`；日期只读 */
export const projectsEditSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'items',
    titleKey: 'name',
    blank: {
      id: '',
      name: '',
      date: { mode: 'custom', text: '' },
      role: '',
      overview: '',
      features: [],
      highlights: [],
      tech: [],
    },
    fields: [
      { key: 'name', label: '项目名（必填）', type: 'text' },
      { key: 'date', label: '时间', type: 'date', wide: true },
      { key: 'role', label: '角色', type: 'text' },
      { key: 'overview', label: '项目概述', type: 'textarea', wide: true },
      { key: 'features', label: '功能点（回车添加）', type: 'textItems', wide: true },
      { key: 'highlights', label: '亮点（回车添加）', type: 'textItems', wide: true },
      { key: 'tech', label: '技术栈（回车添加）', type: 'textItems', wide: true },
    ],
  },
]

/**
 * 个人能力：root = capabilities 模块的 `data`。
 *
 * 只编辑**分组**（标题 / 说明）：分组里的能力条目与评分维度是"数组里的数组"，
 * 现有表单表达不了；评分量尺（`ratingScale`）是 `5 | 10 | 100` 的枚举，用数字输入会写出非法值。
 * 这些留给公开站的草稿工作台 —— 那边有专门的评分编辑器。
 */
export const capabilitiesEditSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'groups',
    titleKey: 'title',
    blank: { id: '', title: '', summary: '', items: [] },
    fields: [
      { key: 'title', label: '分组名（必填）', type: 'text' },
      { key: 'summary', label: '分组说明', type: 'text', wide: true },
    ],
  },
]

/** 自我评价：root = evaluations 模块的 `data` */
export const evaluationsEditSegments: FormSegmentSchema[] = [
  {
    mode: 'list',
    listPath: 'items',
    titleKey: 'text',
    blank: { id: '', text: '' },
    fields: [{ key: 'text', label: '评价（必填）', type: 'text', wide: true }],
  },
]

/**
 * 模块 → 字段表的对应关系。
 *
 * 没列进来的模块（如将来出现的 `custom`）在编辑页**只显示标题与条目数**，不做表单 ——
 * 这样契约先长出什么，编辑页也不会"装不认识"。
 */
export const resumeEditSegments: Record<string, FormSegmentSchema[]> = {
  profile: profileEditSegments,
  highlights: highlightsEditSegments,
  education: educationEditSegments,
  experience: experienceEditSegments,
  projects: projectsEditSegments,
  capabilities: capabilitiesEditSegments,
  evaluations: evaluationsEditSegments,
}
