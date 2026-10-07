import type { ResumeSectionKey } from '../types/resume'

/**
 * 区块编辑 schema。
 *
 * 这是「新增区块」的第三处（另外两处：展示组件、注册表）——
 * 有它之后，编辑表单不需要为每个区块手写一套组件。
 */

export type ResumeFieldType = 'text' | 'textarea' | 'tags'

export interface ResumeFieldSchema {
  /** `fields` 模式：相对 ResumeContent 的路径，如 `profile.name` / `evaluations` */
  path?: string
  /** `list` 模式：数组项上的字段名 */
  key?: string
  label: string
  type: ResumeFieldType
  /** 占整行（长文本、标签数组用） */
  wide?: boolean
  placeholder?: string
}

export interface ResumeSectionEditorSchema {
  /** `fields`：直接编辑 content 上的若干字段；`list`：编辑 content 上某个数组 */
  mode: 'fields' | 'list'
  /** `list` 模式下数组在 content 上的路径，如 `experience` */
  listPath?: string
  /** `list` 模式下用哪个字段做项标题 */
  titleKey?: string
  /** `list` 模式下新增项的模板 */
  blank?: Record<string, unknown>
  fields: ResumeFieldSchema[]
}

export const resumeEditorSchemas: Record<ResumeSectionKey, ResumeSectionEditorSchema> = {
  profile: {
    mode: 'fields',
    fields: [
      { path: 'profile.name', label: '姓名', type: 'text' },
      { path: 'profile.headline', label: '定位 / 方向', type: 'text' },
      { path: 'profile.avatarText', label: '头像文字', type: 'text', placeholder: '留空则取姓名首字' },
      { path: 'profile.summary', label: '个人概述', type: 'textarea', wide: true },
    ],
  },
  highlights: {
    mode: 'list',
    listPath: 'highlights',
    titleKey: 'title',
    blank: { title: '新的亮点', description: '' },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'description', label: '说明', type: 'textarea', wide: true },
    ],
  },
  education: {
    mode: 'list',
    listPath: 'education',
    titleKey: 'school',
    blank: { school: '新学校', period: '', degree: '', major: '' },
    fields: [
      { key: 'school', label: '学校', type: 'text' },
      { key: 'period', label: '时间', type: 'text', placeholder: '2017.09 - 2021.06' },
      { key: 'degree', label: '学位', type: 'text' },
      { key: 'major', label: '专业', type: 'text' },
    ],
  },
  experience: {
    mode: 'list',
    listPath: 'experience',
    titleKey: 'company',
    blank: { company: '新公司', period: '', role: '', domain: '', overview: '', achievements: [], tech: [] },
    fields: [
      { key: 'company', label: '公司', type: 'text' },
      { key: 'period', label: '时间', type: 'text' },
      { key: 'role', label: '职位', type: 'text' },
      { key: 'domain', label: '行业 / 类型', type: 'text' },
      { key: 'overview', label: '工作概述', type: 'textarea', wide: true },
      { key: 'achievements', label: '主要成果', type: 'tags', wide: true },
      { key: 'tech', label: '技术栈', type: 'tags', wide: true },
    ],
  },
  projects: {
    mode: 'list',
    listPath: 'projects',
    titleKey: 'name',
    blank: { name: '新项目', period: '', role: '', overview: '', features: [], highlights: [], tech: [] },
    fields: [
      { key: 'name', label: '项目名', type: 'text' },
      { key: 'period', label: '时间', type: 'text' },
      { key: 'role', label: '角色', type: 'text' },
      { key: 'overview', label: '项目概览', type: 'textarea', wide: true },
      { key: 'features', label: '核心功能', type: 'tags', wide: true },
      { key: 'highlights', label: '亮点 / 难点', type: 'tags', wide: true },
      { key: 'tech', label: '技术栈', type: 'tags', wide: true },
    ],
  },
  skills: {
    mode: 'list',
    listPath: 'skills',
    titleKey: 'group',
    blank: { group: '新分组', items: [] },
    fields: [
      { key: 'group', label: '分组', type: 'text' },
      { key: 'items', label: '技能项', type: 'tags', wide: true },
    ],
  },
  evaluations: {
    mode: 'fields',
    fields: [
      { path: 'evaluations', label: '自我评价', type: 'tags', wide: true },
      { path: 'footerNote', label: '结尾致谢', type: 'textarea', wide: true },
    ],
  },
}
