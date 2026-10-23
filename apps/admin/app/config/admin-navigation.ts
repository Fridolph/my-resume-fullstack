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
    // 发布管理（分享链接）。与「简历」并列：它回答的是
    // "我已经发出去的链接现在什么状态"，属于同一层的作者事务。
    label: '发布管理',
    icon: 'i-lucide-share-2',
    to: '/shares',
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
    // 设置里的子项：**我的资料**改的是账号本身，其余是项目配置 ——
    // 混在一起会让"改个昵称"也要求配置权限，权限面就错了。
    label: 'Settings',
    icon: 'i-lucide-settings-2',
    children: [
      { label: '我的资料', to: '/settings/user' },
      { label: 'Company profile', to: '/settings/company' },
      { label: 'Team', to: '/settings/team' },
      { label: 'Print config', to: '/settings/print-config' },
    ],
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
