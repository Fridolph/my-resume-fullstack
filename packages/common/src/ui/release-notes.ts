/**
 * 发版记录（**数据源**）。
 *
 * ⚠️ 本文件的 `RESUME_RELEASES` 由 `scripts/sync-release-notes.mjs` 从 `CHANGELOG.md` 生成，
 * **不要手改**（下次发版会覆盖）。要修正措辞，改 `CHANGELOG.md` 对应条目。
 *
 * 为什么数据在这里、而页面只渲染：见脚本头部的说明（发版工具不该改 .vue 源码）。
 */

/** 一条版本记录 */
export interface ResumeRelease {
  version: string
  date: string
  unreleased?: boolean
  title: string
  changes: string[]
}

/** 版本记录（新 → 旧）。⚠️ 由 `scripts/sync-release-notes.mjs` 从 `CHANGELOG.md` 生成 */
export const RESUME_RELEASES: ResumeRelease[] = [
  {
    version: '0.4.0',
    date: '',
    unreleased: true,
    title: '公开站与发布：访客可看、作者就地可改',
    changes: [
      '[新功能] 公开站：`/` 展示默认简历、`/resume/:id` 展示指定简历（访客无需登录，SSR 直出）',
      '[新功能] 后端两个 `@Public()` 只读接口：`GET /resume/public` 与 `GET /resume/public/:id`',
      '[重构] 作者侧路由迁到 `/my-resumes`（列表）与 `/my-resumes/draft/:id`（工作台）',
      '[新功能] 公开页「编辑模式」就地编辑：拖拽排序、上下移动、隐藏、编辑模块内容',
      '[新功能] 展示设置抽屉（布局与风格 / 主题与背景 / 区块显隐）；样式配置只存浏览器本地',
      '[新功能] 简历自定义模块：自建模块（标题 / 描述 / 4 种展示方式）并与预设模块一起编排',
      '[重构] admin 编辑页改为两栏工作台：左侧模块列表，右侧只编辑当前模块',
      '[问题修复] 富文本编辑器改用 Nuxt UI `UEditor` 并接入 13 个按钮的工具栏',
      '[问题修复] 草稿保存链路：修掉 reactive 代理导致的 `DataCloneError`（此前 PUT 一次都没发出）',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-13',
    title: '简历系统：草稿工作台、模块编排与 admin 管理',
    changes: [
      '[新功能] 简历多份管理：创建、重命名、硬删除与「设为默认展示」（互斥）',
      '[新功能] 草稿工作台：自动保存（防抖）与 `revision` 条件更新，冲突返回 409 而非静默覆盖',
      '[新功能] 简历契约 `ResumeDocument`：判别联合 + 服务端 Zod 严格校验 + 100 KiB 上限',
      '[新功能] 展示层三档风格（minimal / standard / pro）与主题、背景配置',
      '[新功能] admin：简历列表（卡片 / 表格两视图）、创建页、只读详情页与真实登录会话',
      '[新功能] 用户与权限：三角色 + 权限键；JWT/Passport 每次请求回查身份恢复权限',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-06',
    title: '分层与组件库：layers、共享包与请求层',
    changes: [
      '[新功能] Nuxt Layers：11-projects / 12-teams / 13-settings / 20-comps 自动发现',
      '[新功能] 共享层：`packages/common`（纯 TS 契约与工具）与 `packages/ui`（跨端 UI 组件）',
      '[新功能] 统一请求层 `$api`：统一响应契约、错误归一化与按错误码的处理策略',
      '[新功能] 数据层：`@pinia/colada` 缓存与 query key 约定',
      '[文档] 组件示例页 `/comps/*`：断点、图标、浮层、加载器、排序等对照页',
      '[构建] 工程基线：Tailwind v4 九档断点、Oxlint/Oxfmt、Turborepo 任务图',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-05',
    title: '初始脚手架',
    changes: [
      '[构建] pnpm workspace + Turborepo：`apps/web`、`apps/admin`、`apps/server`',
      '[构建] Nuxt 4 + Nuxt UI 4 + Tailwind CSS 4 前端骨架，NestJS 后端骨架',
      '[新功能] 布局体系：has-sidebar / demo / docs / empty / pdf',
      '[构建] 本地基础设施：`compose.yaml`（PostgreSQL + Redis）与 `.env.example`',
    ],
  },
]
