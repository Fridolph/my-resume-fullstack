import type { AdminBrandConfig, AdminNavigationItem } from '../types/admin'

export const adminBrand: AdminBrandConfig = {
  name: 'Admin Studio',
  mark: 'A',
  href: '/',
}

export const adminNavigation: AdminNavigationItem[] = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/',
  },
  {
    // 业务域入口：my-resume 的简历编辑域（layers/11-resume）
    label: '简历',
    icon: 'i-lucide-file-text',
    to: '/resume',
  },
  {
    // 审计：**入口对所有人可见**（Owner 2026-10-16）—— 非超管点进去拿 403，
    // 那本身就是答案："系统有审计，但你没这个权限"。
    // 真正的拦阻在 middleware/permission.ts 与后端 assertAuditViewer 两处。
    label: '审计',
    icon: 'i-lucide-scroll-text',
    to: '/audit',
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings-2',
    to: '/settings',
  },
  {
    label: 'Comps',
    icon: 'i-lucide-component',
    children: [
      { label: 'Overlay / Modal (shared)', to: '/comps/overlay' },
      { label: 'Full screen gallery (shared)', to: '/comps/full-screen-modal' },
      { label: 'Icon', to: '/comps/icon' },
      { label: 'Breakpoints', to: '/comps/breakpoints' },
      { label: 'Loaders', to: '/comps/loaders' },
      { label: 'Upload', to: '/comps/upload' },
      { label: 'Sort list', to: '/comps/sort-list' },
      { label: 'Sortable bar', to: '/comps/sortable-bar' },
      { label: 'Permission wrapper', to: '/comps/permission-wrapper' },
    ],
  },
  {
    // 模板示例（原一级 Projects / Team）与功能 demo 折叠在同一个入口下
    label: 'Demos',
    icon: 'i-lucide-flask-conical',
    children: [
      { label: 'Projects demo', to: '/projects' },
      { label: 'Projects recent', to: '/projects/recent' },
      { label: 'Team members', to: '/team/members' },
      { label: 'Team roles', to: '/team/roles' },
      { label: 'PDF review', to: '/demos/pdf-review' },
      { label: 'Plugins', to: '/demos/plugins' },
      { label: 'Utils', to: '/demos/utils' },
      { label: 'Request / errors', to: '/demos/request' },
      { label: 'Resume config layout', to: '/demos/resume-config-layout' },
      { label: 'Resume layout editor', to: '/demos/layout-editor' },
      { label: 'Resume options tabs', to: '/demos/options-tabs' },
      { label: 'Resume compare modal', to: '/demos/compare-modal' },
      { label: 'Hobby gallery', to: '/demos/hobby-modal' },
    ],
  },
]

export const adminExternalNavigation: AdminNavigationItem[] = [
  { label: 'Help center', icon: 'i-lucide-circle-help', to: '/help' },
  { label: 'Release notes', icon: 'i-lucide-megaphone', to: '/release-notes' },
]
