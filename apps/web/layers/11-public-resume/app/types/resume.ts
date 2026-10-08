/**
 * 公开简历展示的领域类型。
 *
 * 四个维度（互不耦合）：
 * - `ResumeContent`：内容（来自简历快照，单语言；语言由 draft 承载，见 DAO-005 的领域模型方向）
 * - `ResumeDisplayConfig`：布局与编排（顺序 / 显隐 / 分栏 / 细粒度开关）
 * - `ResumeThemeConfig`：配色（主色与渐变，最终以 CSS 变量下发给组件）
 * - `ResumeStyleConfig`：风格（区块「长什么样」，与配色、编排正交，见 docs/dev/resume-styles.md）
 *
 * admin 侧负责生成配置，web 侧只渲染；两边共用这几个类型即可长期同构。
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

/**
 * 拖拽落点：三个栏位之一，或「未使用模块」托盘。
 *
 * - 落到栏位：写 `sections.slot`（归属）并取消隐藏
 * - 落到托盘：加入 `sections.hidden`（不改 order，便于拖回原位）
 */
export type ResumeDropTarget = ResumeSlotKey | 'tray'

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

/**
 * 主视觉信息（`standard` 风格的头像翻牌与标语）。
 *
 * 对齐旧站 `ResumeProfileHero`，但按本仓方向去掉字段级 locale。
 */
export interface ResumeProfileHero {
  /** 头像正面图；为空时回退 `avatarText` 文本块 */
  frontImageUrl: string
  /** 翻牌背面图 */
  backImageUrl: string
  /**
   * 旧站指向站内 AI 对话页（`/ai-talk`）。
   * 本仓**只存不跳转**：翻牌是纯视觉，接入对话属跨域能力，另立任务。
   */
  linkUrl: string
  /** 标语；渲染时最多取 2 条（与旧站一致） */
  slogans: string[]
}

/** 个人链接（`icon` 沿用旧站的 iconify 名，如 `ri:github-fill`） */
export interface ResumeProfileLink {
  label: string
  url: string
  icon?: string
}

/** 兴趣项（`icon` 同 `ResumeProfileLink`） */
export interface ResumeProfileInterest {
  label: string
  icon?: string
}

export interface ResumeProfile {
  name: string
  /** 定位 / 方向，如「全栈开发 / 前端方向」 */
  headline: string
  /** 个人概述 */
  summary: string
  /** 无头像图时展示的文本（通常是姓名首字） */
  avatarText?: string
  hero: ResumeProfileHero
  contact: ResumeContactItem[]
  links: ResumeProfileLink[]
  interests: ResumeProfileInterest[]
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

/** 页面品牌区（未配置的字段回退预设：姓名 / 定位 / 姓名首字） */
export interface ResumeBrandConfig {
  /** 文字标记；留空取姓名首字 */
  logoText?: string
  /** 图片 logo（本轮只建模，上传后置） */
  logoUrl?: string
  /** 标题；留空取 `profile.name` */
  title?: string
  /** 描述；留空取 `profile.headline` */
  description?: string
}

/**
 * 预设风格：决定区块「长什么样」，与 `theme`（颜色）、`layout`（编排）正交。
 *
 * 本轮只实现两档；`cool`（页面级动效 / 整页模板）在 P2 真正实现时再加，
 * 避免契约里出现「看似支持、选了却空白」的枚举值（该字段会进公开快照）。
 */
export type ResumeStyleId = 'minimal' | 'standard'

export interface ResumeStyleConfig {
  id: ResumeStyleId
}

/**
 * 展示配置总成（对外只有这一个入口对象）。
 *
 * 拆成多块，各自可独立演进：品牌（页头）、布局（怎么排）、区块（排什么）、
 * 展示开关、配色（什么颜色）、背景（衬什么底）、风格（长什么样）。
 * admin 侧将来生成同一个形状，web 侧只渲染 —— 契约一致即可长期同构。
 */
export interface ResumeDisplayConfig {
  brand: ResumeBrandConfig
  layout: ResumeLayoutConfig
  sections: ResumeSectionsConfig
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
  background: ResumeBackgroundConfig
  style: ResumeStyleConfig
}

/**
 * 所有区块组件共用的 props 契约。
 *
 * 渲染器只按这个契约传参，不认识任何具体区块；新增区块只要满足契约即可插拔。
 *
 * `variant` 只承载**结构差异**（hero 的呈现方式、外壳标题结构），
 * 纯视觉参数（圆角 / 阴影 / 渐变 / hover）走 `--resume-*` 风格 token，
 * 见 docs/dev/resume-styles.md §5。
 */
export interface ResumeSectionProps {
  section: { key: ResumeSectionKey; label: string; icon: string }
  content: ResumeContent
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
  variant: ResumeStyleId
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
