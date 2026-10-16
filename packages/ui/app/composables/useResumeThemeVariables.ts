import type { CSSProperties } from 'vue'
import type { ResumeDisplayConfig, ResumeStyleId } from '@rs/common'

/**
 * 三档风格的「外观参数」（盒子层面）。
 *
 * 与主题（颜色）**正交**：这里只放圆角 / 内边距 / 字级 / 表面 / 阴影，颜色一律由 `--resume-*` 派生，
 * 所以「风格 × 主题（预设 × 明暗）」的任意组合都不会互相污染。
 * 用映射表表达：**加一档风格 = 加一行**，不堆三元表达式。
 */
const CARD_STYLE: Record<
  ResumeStyleId,
  {
    radius: string
    padding: string
    titleSize: string
    bg: string
    shadow: string
    shadowHover: string
    uiRadius: string
  }
> = {
  minimal: {
    radius: '1rem',
    padding: '1.25rem',
    titleSize: '0.875rem',
    bg: 'var(--resume-surface)',
    shadow: 'none',
    shadowHover: 'none',
    uiRadius: '0.5rem',
  },
  standard: {
    radius: '1.5rem',
    padding: '1.5rem',
    titleSize: '1.5rem',
    bg: [
      'radial-gradient(circle at top left, color-mix(in srgb, var(--resume-primary) 10%, transparent), transparent 34%)',
      'radial-gradient(circle at bottom right, color-mix(in srgb, var(--resume-primary) 6%, transparent), transparent 28%)',
      'linear-gradient(180deg, color-mix(in srgb, var(--resume-surface) 88%, transparent), color-mix(in srgb, var(--resume-chip-bg) 60%, var(--resume-surface)))',
    ].join(', '),
    shadow: '0 16px 40px color-mix(in srgb, var(--resume-text) 7%, transparent)',
    shadowHover: '0 20px 44px color-mix(in srgb, var(--resume-primary) 18%, transparent)',
    uiRadius: '0.75rem',
  },
  // 精致：更圆的角、更柔的阴影、单一低调光斑 —— 靠层级与留白，而不是堆装饰
  pro: {
    radius: '1.75rem',
    padding: '1.5rem',
    titleSize: '1.25rem',
    bg: [
      'radial-gradient(circle at top right, color-mix(in srgb, var(--resume-primary) 9%, transparent), transparent 40%)',
      'linear-gradient(180deg, color-mix(in srgb, var(--resume-surface) 92%, transparent), color-mix(in srgb, var(--resume-chip-bg) 45%, var(--resume-surface)))',
    ].join(', '),
    shadow: '0 20px 50px color-mix(in srgb, var(--resume-text) 6%, transparent)',
    shadowHover: '0 24px 56px color-mix(in srgb, var(--resume-primary) 16%, transparent)',
    uiRadius: '0.875rem',
  },
}

/**
 * 把 `display.theme`（颜色）+ `display.style`（外观参数）算成一组 **CSS 变量**。
 *
 * ## 为什么放在 `packages/ui`（而不是各页面各写一遍）
 *
 * 「简历长什么样」由这组变量决定，公开站、草稿工作台预览、admin 只读详情页都要同一套结果 ——
 * 各写一份必然漂移（此前就有一份「预览用简化版、公开页用完整版」的分叉）。这里只做**纯计算**，
 * 不碰 Vue 生命周期，符合「能脱离业务语义复用」的判据。
 *
 * 返回的是 `CSSProperties`，调用方自己决定挂哪儿：
 * - 只渲染一份简历（工作台预览）→ 挂在容器上即可；
 * - 需要让 teleport 到 `<body>` 的弹层也跟随主题（公开页）→ 用 `useHead({ bodyAttrs: { style } })`。
 *
 * 变量默认值集中在 `packages/ui/app/assets/css/resume.css`。
 */
export function useResumeThemeVariables(display: MaybeRefOrGetter<ResumeDisplayConfig>) {
  return computed<CSSProperties>(() => {
    const config = toValue(display)
    const { theme, style } = config
    const card = CARD_STYLE[style.id]
    /** 当前明暗对应的那组色值（自定义主题可逐项编辑） */
    const palette = theme[theme.mode]
    const isDark = theme.mode === 'dark'

    return {
      // ── 主题（颜色）──
      '--resume-primary': palette.primary,
      '--resume-gradient-from': palette.gradientFrom,
      '--resume-gradient-to': palette.gradientTo,
      // 页面底色：由 primary 派生的柔和渐变，随主题变化
      '--resume-page': [
        'radial-gradient(circle at top, color-mix(in srgb, var(--resume-primary) 14%, transparent), transparent 24%)',
        isDark
          ? 'linear-gradient(180deg, #020617 0%, #0f172a 100%)'
          : 'linear-gradient(180deg, color-mix(in srgb, var(--resume-primary) 3%, #f7f9fe) 0%, color-mix(in srgb, var(--resume-primary) 6%, #eef3fb) 100%)',
      ].join(', '),
      '--resume-surface': palette.surface,
      '--resume-border': palette.border,
      '--resume-text': palette.text,
      '--resume-muted': palette.muted,
      '--resume-chip-bg': palette.chipBg,
      '--resume-chip-text': palette.chipText,

      // ── 风格（外观参数）──
      '--resume-card-radius': card.radius,
      '--resume-card-padding': card.padding,
      '--resume-title-size': card.titleSize,
      '--resume-card-bg': card.bg,
      '--resume-card-shadow': card.shadow,
      '--resume-card-shadow-hover': card.shadowHover,

      // ── 让 Nuxt UI 组件（弹层 / 按钮 / 徽标）跟随简历主题 ──
      // 公开页的登录弹窗与设置抽屉是 teleport 到 body 的，只挂容器上它们解析不到。
      '--ui-primary': 'var(--resume-primary)',
      '--ui-radius': card.uiRadius,
    } as CSSProperties
  })
}
