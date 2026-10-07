/**
 * 公开简历展示的领域类型。
 *
 * 三分模型（互不耦合）：
 * - `ResumeContent`：内容（来自简历快照，单语言；语言由 draft 承载，见 DAO-005 的领域模型方向）
 * - `ResumeDisplayConfig`：布局（顺序 / 显隐 / 分栏 / 细粒度开关）
 * - `ResumeThemeConfig`：主题（主色与渐变，最终以 CSS 变量下发给组件）
 *
 * admin 侧负责生成配置，web 侧只渲染；两边共用这三个类型即可长期同构。
 */

/** 可展示的区块键 */
export type ResumeSectionKey =
  | 'profile'
  | 'highlights'
  | 'education'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'evaluations'

/** 区块归属栏位：side = 左侧个人信息栏，main = 右侧内容栏 */
export type ResumeColumn = 'side' | 'main'

/** 基本信息里的联系方式条目（由展示选项决定是否出现） */
export interface ResumeContactItem {
  key: 'email' | 'phone' | 'location' | 'years' | 'education'
  label: string
  value: string
  icon: string
}

export interface ResumeProfile {
  name: string
  /** 定位 / 方向，如「全栈开发 / 前端方向」 */
  headline: string
  /** 个人概述 */
  summary: string
  /** 无头像图时展示的文本（通常是姓名首字） */
  avatarText?: string
  contact: ResumeContactItem[]
}

export interface ResumeHighlight {
  title: string
  description: string
}

export interface ResumeEducationItem {
  school: string
  period: string
  degree: string
  major?: string
}

export interface ResumeExperienceItem {
  company: string
  period: string
  role: string
  /** 职位类型 / 行业，如「SaaS / 企业服务 / ToB」 */
  domain?: string
  overview?: string
  achievements?: string[]
  tech?: string[]
}

export interface ResumeProjectItem {
  name: string
  period: string
  role: string
  overview?: string
  features?: string[]
  highlights?: string[]
  tech?: string[]
}

export interface ResumeSkillGroup {
  group: string
  items: string[]
}

/** 简历内容（后端公开快照的形状；本卡用 mock 提供） */
export interface ResumeContent {
  profile: ResumeProfile
  highlights: ResumeHighlight[]
  education: ResumeEducationItem[]
  experience: ResumeExperienceItem[]
  projects: ResumeProjectItem[]
  skills: ResumeSkillGroup[]
  evaluations: string[]
  footerNote?: string
}

/** 细粒度展示开关（对应内容里的可选字段） */
export interface ResumeDisplayOptions {
  showPhone: boolean
  showEmail: boolean
  showLocation: boolean
  showYears: boolean
  showTechStack: boolean
  showAchievements: boolean
}

/** 主题配置：最终下发为 CSS 变量（--resume-primary 等） */
export interface ResumeThemeConfig {
  id: string
  label: string
  /** 主色 */
  primary: string
  /** 渐变起止（头像 / 强调块） */
  gradientFrom: string
  gradientTo: string
  /** 是否为深色主题（决定纸面与文字色） */
  dark: boolean
}

/** 展示布局配置（admin 生成、web 只读渲染） */
export interface ResumeDisplayConfig {
  /** 区块顺序；未列出的区块按注册表默认顺序追加 */
  order: ResumeSectionKey[]
  /** 隐藏的区块 */
  hidden: ResumeSectionKey[]
  /** 左侧栏是否粘性跟随 */
  stickySidebar: boolean
  /** 左侧栏宽度档位 */
  sidebarWidth: 'compact' | 'wide'
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
}

/**
 * 所有区块组件共用的 props 契约。
 *
 * 渲染器只按这个契约传参，不认识任何具体区块；新增区块只要满足契约即可插拔。
 */
export interface ResumeSectionProps {
  section: { key: ResumeSectionKey; label: string; icon: string }
  content: ResumeContent
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
}
