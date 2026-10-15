import type {
  ResumeBackgroundPreset,
  ResumeDisplayConfig,
  ResumeStyleId,
  ResumeThemeColorKey,
  ResumeThemePreset,
} from '#layers/public-resume/app/types/resume'

/**
 * 风格预设（本轮两档）。
 *
 * 与主题预设不同：这里只声明「有哪些风格」，具体视觉参数由 `styleVars`（容器）
 * 与区块组件的 `variant` 分支承载，见 docs/web/07_简历风格_三档实现.md。
 */
export const resumeStylePresets: { id: ResumeStyleId; label: string; icon: string }[] = [
  { id: 'minimal', label: '极简', icon: 'i-lucide-minus' },
  { id: 'standard', label: '标准', icon: 'i-lucide-layout-panel-top' },
  { id: 'pro', label: '精致', icon: 'i-lucide-sparkles' },
]

/**
 * 主题预设：每套配色自带 **light / dark 两组**色值（都写全，方便自定义逐项改）。
 *
 * 生效色值 = `preset[theme.mode]`；明暗是独立维度，由面板上的「浅色 / 深色」切换。
 *
 * 与 admin 的 `useResumeLayout`（`RESUME_THEME_PRESETS`）字段保持同构，
 * 便于后续「admin 选主题 → web 渲染」直接复用，不用各写一份映射。
 */
export const resumeThemePresets: ResumeThemePreset[] = [
  {
    id: 'blue',
    label: '蓝色简约',
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
  },
  {
    id: 'green',
    label: '绿色清新',
    light: {
      primary: '#2f9e63',
      gradientFrom: '#2f9e63',
      gradientTo: '#7ac943',
      surface: '#ffffff',
      text: '#0f172a',
      muted: '#64748b',
      border: '#e2e8f0',
      chipBg: '#f1f5f9',
      chipText: '#334155',
    },
    dark: {
      primary: '#4ade80',
      gradientFrom: '#4ade80',
      gradientTo: '#a3e635',
      surface: '#111827',
      text: '#e5e7eb',
      muted: '#94a3b8',
      border: '#1f2937',
      chipBg: '#1f2937',
      chipText: '#e2e8f0',
    },
  },
  {
    id: 'tech',
    label: '科技感',
    // 浅色组：冷调浅底 + 青蓝主色（与其它预设的 light 区分在整体色调，而非只换主色）
    light: {
      primary: '#0891b2',
      gradientFrom: '#0891b2',
      gradientTo: '#6366f1',
      surface: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      border: '#e2e8f0',
      chipBg: '#e0f2fe',
      chipText: '#0e7490',
    },
    // 深色组：黑色为主 + 青色高光
    dark: {
      primary: '#22d3ee',
      gradientFrom: '#22d3ee',
      gradientTo: '#6366f1',
      surface: '#000000',
      text: '#e5e7eb',
      muted: '#94a3b8',
      border: '#27272a',
      chipBg: '#18181b',
      chipText: '#a5f3fc',
    },
  },
]

/** 「自定义」主题的 id / 标签：切到它时复制当前配色的两组值，之后逐项微调 */
export const RESUME_CUSTOM_THEME = { id: 'custom', label: '自定义' } as const

/** 调色盘展示 / 编辑的项目（两组共用同一份字段表，顺序即面板中的顺序） */
export const resumeThemeFields: { key: ResumeThemeColorKey; label: string }[] = [
  { key: 'primary', label: '主色' },
  { key: 'gradientFrom', label: '渐变起' },
  { key: 'gradientTo', label: '渐变止' },
  { key: 'surface', label: '纸面' },
  { key: 'text', label: '正文' },
  { key: 'muted', label: '次要文字' },
  { key: 'border', label: '边框' },
  { key: 'chipBg', label: '标签底' },
  { key: 'chipText', label: '标签字' },
]

/** 噪点纹理：体积极小的 SVG data-URI（`#` 已编码为 `%23`） */
export const resumeDisplayMock: ResumeDisplayConfig = {
  // 留空即走预设（姓名 / 定位 / 姓名首字）
  brand: {},
  layout: {
    mode: 'split',
    splitSide: 'left',
    stickySide: true,
    sideWidth: 'compact',
  },
  sections: {
    order: ['profile', 'highlights', 'education', 'experience', 'projects', 'skills', 'evaluations'],
    slot: {},
    hidden: [],
  },
  options: {
    showPhone: true,
    showEmail: true,
    showLocation: true,
    showYears: true,
    showTechStack: true,
    showAchievements: true,
  },
  // 默认：蓝色简约 + 浅色模式
  theme: { ...resumeThemePresets[0]!, mode: 'light' },
  background: {
    type: 'plain',
    textureId: 'none',
    image: { url: '', fit: 'cover', overlay: 30, blur: 0 },
  },
  // 默认 minimal：切风格是显式动作，默认观感保持不变
  style: { id: 'minimal' },
}

// 背景预设（含它依赖的 NOISE_SVG）已上提到 `packages/ui`（随 ResumeBackgroundLayer 一起，DAO-034 批 2）；
// 这里转发，保持 web 内部既有引用不变。
export { resumeBackgroundPresets } from '#layers/ui/app/config/resume-background-presets'
