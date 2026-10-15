/**
 * 简历**展示域**的共享类型（`ResumeContent` 及其组成）。
 *
 * 从 `apps/web/layers/11-public-resume/app/types/resume.ts` 上提到这里（DAO-034）：
 * 展示组件要两端复用（admin 的详情预览 + web 的公开站），它们吃的就是这个形状，
 * 所以类型必须与组件同层可得，否则 admin 只能靠 `any` 或复制一份。
 *
 * 判据是 `@rs/common` 一贯的那条：**能脱离 Vue 运行** —— 这里是纯类型，当然可以。
 * 契约层（`document.ts`）描述的是"文档怎么存"，本文件描述的是"页面怎么画"，
 * 两者靠 `content-mapper.ts` 的 `toResumeContent` 连接，**不要**把二者混成一份。
 */

/**
 * 公开简历展示的领域类型。
 *
 * 四个维度（互不耦合）：
 * - `ResumeContent`：内容（来自简历快照，单语言；语言由 draft 承载，见 DAO-005 的领域模型方向）
 * - `ResumeDisplayConfig`：布局与编排（顺序 / 显隐 / 分栏 / 细粒度开关）
 * - `ResumeThemeConfig`：配色（主色与渐变，最终以 CSS 变量下发给组件）
 * - `ResumeStyleConfig`：风格（区块「长什么样」，与配色、编排正交，见 docs/web/07_简历风格_三档实现.md）
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
  | 'custom'

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
/**
 * 排布配置。
 *
 * ⚠️ 寻址单位是 **section id（文档内实例身份）**，不是区块类型 key —— 因为自定义模块是**多实例**：
 * 同一份简历里可以有好几条 `custom`，只有 id 能把它们区分开（用 key 的话它们会挤成同一个）。
 * 这与契约的 `display.sections` 完全一致（那边本来就是 id），`toResumeDisplayConfig` 因此可以直通。
 */
export interface ResumeSectionsConfig {
  order: string[]
  slot: Partial<Record<string, ResumeSlotKey>>
  hidden: string[]
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

/** 兴趣图集里的一张图（pro 点击兴趣 → 全屏 gallery 浏览用） */
export interface ResumeInterestImage {
  url: string
  /** 点击这张卡片后跳转的外链 */
  href?: string
  title?: string
}

/** 兴趣项（`icon` 同 `ResumeProfileLink`） */
export interface ResumeProfileInterest {
  label: string
  icon?: string
  /** 一句话说明：hover tooltip 用 */
  description?: string
  /** 该兴趣的图集：pro 点击后在 `MyFullScreenGallery` 里浏览，点击卡片跳 `href` */
  images?: ResumeInterestImage[]
}

/** pro 风格的数字块（如「5 年经验」「30+ 组件」）：值直接给展示文案，避免前端算 */
export interface ResumeProfileStat {
  label: string
  value: string
  hint?: string
}

/** 形象画廊项（本轮只建模 + 展示 URL，上传后置） */
export interface ResumeProfileGalleryItem {
  url: string
  alt?: string
}

/** 能力维度的评分（0~100；用 SVG 手绘，不引入图表库）
 *
 * 归属 `skills` 区：那里以 tabs 切换「词云 / 图表」两种展示（hero 不消费它）。 */
export interface ResumeProfileRadarItem {
  label: string
  value: number
}

/** pro 风格的「求职状态」徽标文案（留空则不展示） */
export type ResumeProfileAvailability = string

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
  /**
   * 以下四项由 `pro` 风格引入，**全部可选**：
   * 旧内容 / 旧 localStorage 里没有，组件侧按 `?? []` + `v-if` 容错。
   */
  stats?: ResumeProfileStat[]
  gallery?: ResumeProfileGalleryItem[]
  radar?: ResumeProfileRadarItem[]
  availability?: ResumeProfileAvailability
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
/**
 * 文档里的区块清单（按文档顺序）。
 *
 * 为什么要单独列一份：区块在**契约里由 `id` 标识**（`display.sections.order` 存的就是 id），
 * 而展示层按**类型**取内容（`content.skills` 等）。两者之间缺一个"由 id 查回 key / 标签 / 图标"
 * 的连接 —— 就是它。自定义模块尤其需要：同一种 view 可以有多个实例，只有 id 能区分。
 */
export interface ResumeSectionSummary {
  id: string
  key: ResumeSectionKey
  /** 显示名：预设取共享定义，自定义模块取**实例自己的 title** */
  label: string
  icon: string
  /** 可选描述（自定义模块由用户填写） */
  description?: string
}

export interface ResumeCustomSectionDraft {
  title: string
  description: string
  view: ResumeCustomView
  /** textList / tagCloud：一行一条 */
  items: string[]
  /** timeline：一项一行；`time` 是用户输入的文本 */
  timeline: { time: string; title: string; description: string }[]
  /** richText：TipTap JSON（`view` 为 richText 时使用） */
  document?: { type: 'doc'; content: Record<string, unknown>[] }
}

/** 自定义模块的展示方式（与契约 `resumeCustomViewSchema` 同集合） */
export type ResumeCustomView = 'textList' | 'tagCloud' | 'timeline' | 'richText'

/**
 * 一个自定义模块的**展示数据**。
 *
 * 与其它区块不同，自定义模块是**多实例** —— 同一个 view 可以有多个模块，各自的标题与内容都不同。
 * 所以它按**实例 id** 组织（`ResumeContent.custom` 是数组），渲染时由 `section.id` 找到自己那一份；
 * 其它区块仍是「一类一份内容」（`content.skills` 等）。
 */
export interface ResumeCustomSection {
  id: string
  /** 用户自己填的模块名（「自定义模块」只是新增时的默认模板，不是它的名字） */
  title: string
  /** 用户自己填的描述 */
  description?: string
  view: ResumeCustomView
  /** textList / tagCloud 的条目文本 */
  items: string[]
  /** timeline 的条目（`time` 已转成显示用文本） */
  timeline: { id: string; time: string; title: string; description?: string }[]
  /** richText 的 TipTap JSON（渲染用 generateHTML，不落 HTML） */
  document?: { type: 'doc'; content: Record<string, unknown>[] }
}

export interface ResumeContent {
  /** 文档里的区块清单（含 id），排布与渲染靠它寻址 */
  sections: ResumeSectionSummary[]
  profile: ResumeProfile
  /** 自定义模块（多实例，按 id 找） */
  custom: ResumeCustomSection[]
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

/** 明暗模式：与「配色预设」正交 —— 同一套预设自带 light / dark 两组色值 */
export type ResumeColorMode = 'light' | 'dark'

/** 一套明暗模式下的全部颜色（调色盘按组展示 / 编辑） */
export interface ResumeThemePalette {
  /** 主色 */
  primary: string
  /** 渐变起止（头像 / 强调块） */
  gradientFrom: string
  gradientTo: string
  /** 纸面 / 卡片底色 */
  surface: string
  /** 正文色 */
  text: string
  /** 次要文字色 */
  muted: string
  /** 边框色 */
  border: string
  /** 标签底色 */
  chipBg: string
  /** 标签文字色 */
  chipText: string
}

/**
 * 主题预设：一套配色自带 **light / dark 两组**色值。
 *
 * 颜色全部显式存值（不派生），因为「自定义」要求两组都能逐项编辑。
 */
export interface ResumeThemePreset {
  id: string
  label: string
  light: ResumeThemePalette
  dark: ResumeThemePalette
}

/**
 * 生效的主题配置 = 一套配色 + 当前明暗。
 *
 * `mode` 决定用哪一组色值，也决定页面底色渐变与背景遮罩的明暗。
 */
export interface ResumeThemeConfig extends ResumeThemePreset {
  mode: ResumeColorMode
}

/** 调色盘可编辑的颜色字段（即 palette 的键） */
export type ResumeThemeColorKey = keyof ResumeThemePalette

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
 * - `minimal`：极简（文本块 + 列表）
 * - `standard`：标准（对齐旧站：翻牌头像 + 分块 + eyebrow）
 * - `pro`：精致（画廊 / 数字块 / 能力雷达 / 求职状态；动效分期）
 *
 * 约定：只加**已经实现**的档位 —— 该字段会进公开快照，塞未实现的枚举会让前后端校验对不上。
 */
export type ResumeStyleId = 'minimal' | 'standard' | 'pro'

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
 * 见 docs/web/07_简历风格_三档实现.md §5。
 */
/**
 * hero 三档实现（`components/resume/hero/*`）的共用入参。
 *
 * 外层契约仍是 `ResumeSectionProps`；薄壳只把渲染需要的那几项透传下去。
 */
export interface ResumeHeroProps {
  content: ResumeContent
  options: ResumeDisplayOptions
  variant: ResumeStyleId
}

/**
 * 区块「内容实现」的共用入参（`components/resume/<section>/*`）。
 *
 * 外层契约仍是 `ResumeSectionProps`：薄壳保留外壳与标题，三档实现只管**内容部分**，
 * 所以这里没有 `section` / `theme`（标题与外观由外壳统一消费）。
 * 与 `ResumeHeroProps` 同构 —— hero 不用 `ResumeSectionCard`，故单独留名。
 */
export interface ResumeSectionBodyProps {
  content: ResumeContent
  options: ResumeDisplayOptions
  variant: ResumeStyleId
}

export interface ResumeSectionProps {
  /** `id` 是文档内的实例身份 —— 自定义模块靠它区分同 view 的多个实例 */
  section: { id: string; key: ResumeSectionKey; label: string; icon: string }
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
