import type {
  ResumeBackgroundPreset,
  ResumeDisplayConfig,
  ResumeStyleId,
  ResumeThemeColorKey,
  ResumeThemeConfig,
} from '#layers/public-resume/app/types/resume'

/**
 * 风格预设（本轮两档）。
 *
 * 与主题预设不同：这里只声明「有哪些风格」，具体视觉参数由 `styleVars`（容器）
 * 与区块组件的 `variant` 分支承载，见 docs/dev/resume-styles.md。
 */
export const resumeStylePresets: { id: ResumeStyleId, label: string, icon: string }[] = [
  { id: 'minimal', label: '极简', icon: 'i-lucide-minus' },
  { id: 'standard', label: '标准', icon: 'i-lucide-layout-panel-top' },
]

/**
 * 主题预设（合并式：一套预设自带明暗与全部颜色）。
 *
 * 颜色**写全**，与「自定义」主题字段完全一致 —— 自定义就是复制当前值再逐项改，
 * 所以不能靠 `dark` 派生颜色。
 *
 * 与 admin 的 `useResumeLayout`（`RESUME_THEME_PRESETS`）字段保持同构，
 * 便于后续「admin 选主题 → web 渲染」直接复用，不用各写一份映射。
 */
export const resumeThemePresets: ResumeThemeConfig[] = [
  {
    id: 'light',
    label: '蓝色简约',
    dark: false,
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
  {
    id: 'forest',
    label: '绿色清新',
    dark: false,
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
  {
    id: 'night',
    label: '深色科技',
    dark: true,
    primary: '#22d3ee',
    gradientFrom: '#22d3ee',
    gradientTo: '#6366f1',
    surface: '#111827',
    text: '#e5e7eb',
    muted: '#94a3b8',
    border: '#1f2937',
    chipBg: '#1f2937',
    chipText: '#e2e8f0',
  },
]

/** 「自定义」主题的 id / 标签：切到它时复制当前配色，之后逐项微调 */
export const RESUME_CUSTOM_THEME = { id: 'custom', label: '自定义' } as const

/** 调色盘展示 / 编辑的项目（顺序即面板中的顺序） */
export const resumeThemeFields: { key: ResumeThemeColorKey, label: string }[] = [
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
const NOISE_SVG
  = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")"

/**
 * 背景纹理预设：全部是纯 CSS / SVG，不新增依赖。
 *
 * `css` 直接喂给背景层的 `background`，`size` 给 `background-size`。
 */
export const resumeBackgroundPresets: ResumeBackgroundPreset[] = [
  { id: 'none', label: '纯色', css: '', size: 'auto' },
  {
    id: 'dots',
    label: '点阵',
    css: 'radial-gradient(rgb(148 163 184 / 0.45) 1px, transparent 1px)',
    size: '16px 16px',
  },
  {
    id: 'grid',
    label: '细网格',
    css: 'linear-gradient(rgb(148 163 184 / 0.3) 1px, transparent 1px), linear-gradient(90deg, rgb(148 163 184 / 0.3) 1px, transparent 1px)',
    size: '24px 24px',
  },
  {
    id: 'mesh',
    label: '渐变光斑',
    css: 'radial-gradient(60% 50% at 15% 20%, rgb(21 120 208 / 0.3), transparent 70%), radial-gradient(50% 45% at 85% 15%, rgb(62 192 100 / 0.28), transparent 70%), radial-gradient(55% 50% at 70% 85%, rgb(99 102 241 / 0.26), transparent 70%)',
    size: 'auto',
  },
  { id: 'noise', label: '噪点', css: NOISE_SVG, size: '120px 120px' },
]

/**
 * 展示配置 mock（接后端后由公开快照携带）。
 *
 * 想验证「配置驱动」是否成立，直接改这里：换 `layout.mode`、把区块放进 `hidden`、
 * 或改 `background.textureId` / `theme`，页面应立即跟着变。
 */
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
  theme: resumeThemePresets[0]!,
  background: {
    type: 'plain',
    textureId: 'none',
    image: { url: '', fit: 'cover', overlay: 30, blur: 0 },
  },
  // 默认 minimal：切风格是显式动作，默认观感保持不变
  style: { id: 'minimal' },
}
