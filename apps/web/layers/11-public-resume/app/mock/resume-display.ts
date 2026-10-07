import type { ResumeDisplayConfig, ResumeThemeConfig } from '../types/resume'

/**
 * 主题预设。
 *
 * 与 admin 的 `useResumeLayout`（`RESUME_THEME_PRESETS`）保持同一套字段，
 * 便于「admin 选主题 → web 渲染」不再各写一份映射。
 */
export const resumeThemePresets: ResumeThemeConfig[] = [
  {
    id: 'light',
    label: '简约白',
    primary: '#1578d0',
    gradientFrom: '#1578d0',
    gradientTo: '#3ec064',
    dark: false,
  },
  {
    id: 'forest',
    label: '绿色清新',
    primary: '#2f9e63',
    gradientFrom: '#2f9e63',
    gradientTo: '#7ac943',
    dark: false,
  },
  {
    id: 'business',
    label: '蓝色商务',
    primary: '#1d4ed8',
    gradientFrom: '#1d4ed8',
    gradientTo: '#0ea5e9',
    dark: false,
  },
  {
    id: 'night',
    label: '深色科技',
    primary: '#22d3ee',
    gradientFrom: '#22d3ee',
    gradientTo: '#6366f1',
    dark: true,
  },
]

/**
 * 展示配置 mock（接后端后由公开快照携带）。
 *
 * 想验证「配置驱动」是否真的成立，直接改这里即可：
 * 调整 `order`、把某项加入 `hidden`、或换 `theme`，页面应立刻跟着变。
 */
export const resumeDisplayMock: ResumeDisplayConfig = {
  order: ['profile', 'highlights', 'education', 'experience', 'projects', 'skills', 'evaluations'],
  hidden: [],
  stickySidebar: true,
  sidebarWidth: 'compact',
  options: {
    showPhone: true,
    showEmail: true,
    showLocation: true,
    showYears: true,
    showTechStack: true,
    showAchievements: true,
  },
  theme: resumeThemePresets[0]!,
}
