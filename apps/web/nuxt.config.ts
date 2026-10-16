import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // 图标：默认会自动发现本地安装的 `@iconify-json/*` 集（lucide、ri …），
  // 再加上这里的**本地 svg 目录** —— 三者共用同一套类名约定：
  //   i-lucide-*      Lucide（Nuxt UI 默认集）
  //   i-ri-*          Remix Icon（@iconify-json/ri，已安装）
  //   其他 iconify 集  装一个 @iconify-json/<集名> 就能用 i-<集名>-*
  //   i-local:*       app/assets/icons/*.svg 里的本地图标（文件名即图标名）
  icon: {
    customCollections: [{ prefix: 'local', dir: './app/assets/icons' }],
  },

  // 跨 app 共享 UI 组件（Nuxt layer，见 packages/ui/README.md）
  extends: ['../../packages/ui'],
  srcDir: 'app',
  modules: ['@nuxt/ui', '@pinia/nuxt', '@pinia/colada-nuxt'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  // 展示域类型（`ResumeContent` 等）的**源码定义**入口。
  //
  // ⚠️ 本层组件用 `defineProps<ResumeSectionProps>()` 这种"整块外部类型"时，
  // Vue 的 SFC 编译器**不会展开包的 re-export 链**（`@rs/common` 的 dist 入口是一串 `export *`）——
  // `typecheck` / `build` 都不报，**只有 dev 的 SFC 编译会炸**。指向源码即可解析。
  // 只能写在宿主（本文件），不能写在 layer：layer 的 alias 不参与宿主上下文的解析。
  alias: {
    '#rs/resume-content': fileURLToPath(new URL('../../packages/common/src/resume/content.ts', import.meta.url)),
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4049/api',
    },
  },
  typescript: { strict: true, typeCheck: true },
  compatibilityDate: '2025-01-01',

  // ── Tiptap / ProseMirror 必须是**单实例** ───────────────────────────────────
  //
  // 现象（2026-10-15 真实复现）：`packages/ui` 的 `CustomSectionEditor` 挂载 `UEditor` 时抛
  // `RangeError: Adding different instances of a keyed plugin (plugin$)`，堆栈落在
  // `prosemirror-state → EditorState.reconfigure`，结果是富文本区一片空白、点不动。
  //
  // 病因不在安装：磁盘上 `@tiptap/pm` 与所有 `prosemirror-*` 各只有一份（apps/web 与
  // packages/ui 的软链指向同一处）。真正的分裂来自 **Vite dev 的按需预打包** ——
  // `@tiptap/core` 的那份 prosemirror-state 与运行时另加载的一份不是同一个模块实例。
  //
  // 修法：把这条链显式列入 `optimizeDeps.include`，强制预打包成同一实例。
  // 这段配置在 #37 移除自研编辑器时被删掉，`apps/admin/nuxt.config.ts` 当时留了恢复提示
  // （"将来若重新引入基于 Tiptap 的编辑器（包括直接使用 @nuxt/ui 的编辑器组件）"）。
  // 编辑器上提到 `packages/ui` 后**两端都会执行**，所以两端都要补。
  //
  // 注意前缀：`prosemirror-*` 是 `@nuxt/ui` 的（传递）依赖，apps/* 自己解析不到它，
  // 必须写成 `@nuxt/ui > prosemirror-*` 才能从那个依赖上下文里解析。
  // 另外**不要**把 `@tiptap/pm` 写进来：它没有根导出（只有 `@tiptap/pm/state` 这类子路径），
  // 写进去会让 Vite 启动直接失败（`"." is not exported from package .../@tiptap/pm`）。
  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-gapcursor',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-tables',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-view',
        '@tiptap/core',
        '@tiptap/starter-kit',
        '@tiptap/vue-3',
      ],
    },
  },
})
