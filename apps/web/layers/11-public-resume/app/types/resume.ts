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

/** 展示布局模式：通栏 / 左右 / 三栏 */
export type ResumeLayoutMode = 'single' | 'split' | 'threeColumn'

/** 区块归属栏位：side = 左栏，main = 中栏（主内容），rail = 右栏 */
export type ResumeSlotKey = 'side' | 'main' | 'rail'

/** split 模式下固定栏的位置 */
export type ResumeSplitSide = 'left' | 'right'

/** 布局配置：模式与其开关（与 `sections` 分离，切布局不丢区块编排） */
export interface ResumeLayoutConfig {
  mode: ResumeLayoutMode
  /** split：固定栏在左还是右 */
  splitSide: ResumeSplitSide
  stickySide: boolean
  /** side 栏宽度档位（280px / 360px） */
  sideWidth: 'compact' | 'wide'
}

/**
 * 区块编排：拖拽排序与管理员配置的落点。
 *
 * - `order`：全局阅读顺序（同栏拖拽改这里）
 * - `slot`：覆盖注册表里的默认归属（跨栏拖拽改这里）
 * - `hidden`：整体隐藏
 */
export interface ResumeSectionsConfig {
  order: ResumeSectionKey[]
  slot: Partial<Record<ResumeSectionKey, ResumeSlotKey>>
  hidden: ResumeSectionKey[]
}

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
export type ResumeBackgroundType = 'plain' | 'texture' | 'image'

/** 背景图（本轮仅建模：上传与存储另立任务） */
export interface ResumeBackgroundImage {
  url: string
  fit: 'cover' | 'contain'
  /** 遮罩强度 0~100，保证任何背景下卡片与正文可读 */
  overlay: number
  /** 模糊 0~20px */
  blur: number
}

export interface ResumeBackgroundConfig {
  type: ResumeBackgroundType
  /** plain / texture 时使用的预设 id */
  textureId: string
  image: ResumeBackgroundImage
}

/**
 * 展示配置总成（对外只有这一个入口对象）。
 *
 * 拆成四块，各自可独立演进：布局（怎么排）、区块（排什么）、主题（什么风格）、背景（衬什么底）。
 * admin 侧将来生成同一个形状，web 侧只渲染 —— 契约一致即可长期同构。
 */
export interface ResumeDisplayConfig {
  layout: ResumeLayoutConfig
  sections: ResumeSectionsConfig
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
  background: ResumeBackgroundConfig
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

/** 背景纹理预设（纯 CSS / SVG data-URI，不引入依赖） */
export interface ResumeBackgroundPreset {
  id: string
  label: string
  /** 可直接用于 CSS `background` 的值；`plain` 预设为空串 */
  css: string
  /** CSS `background-size` */
  size: string
}
