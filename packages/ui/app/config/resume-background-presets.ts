import type { ResumeBackgroundPreset } from '#rs/resume-content'

/**
 * 背景预设（展示用常量）：纹理 / 渐变 / 图片三类可选底色。
 *
 * 原在 web 的 `mock/resume-display.ts` 里，但它不是演示数据、而是**渲染依赖的常量** ——
 * `ResumeBackgroundLayer` 用它把 `background.textureId` 解析成实际样式，
 * 所以随组件一起上提到 `packages/ui`（DAO-034 批 2）。
 */
const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")"

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
