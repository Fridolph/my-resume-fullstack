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
      /** 401 时请求层把人送到这里（web 端不用跳转，所以不配） */
      loginPath: '/login',
    },
  },
  typescript: { strict: true, typeCheck: true },
  compatibilityDate: '2025-01-01',

  // ── Tiptap / ProseMirror 必须是**单实例** ───────────────────────────────────
  //
  // 原先这里有一段 `vite.optimizeDeps.include`，把 prosemirror / @tiptap/* 预打包成单实例，
  // 用来避免 Tiptap 报 "Adding different instances of a keyed plugin"。随自研 TextEditor 移除，
  // 那段配置在 #37 被删除，并在此留了恢复提示。
  //
  // 2026-10-15：富文本编辑器以「`packages/ui` 的 `CustomSectionEditor` + Nuxt UI `UEditor`」的
  // 形式重新引入 —— 正是当时预告的情形，于是**按提示把配置加回来**（否则实测复现该 RangeError，
  // 富文本区空白且点不动）。两端共享同一个编辑器，所以 apps/web 也补了同一段。
  //
  // 与旧版的两点差异：
  //   1. 去掉了 `@tiptap/extension-*` 与 highlight.js / lowlight —— 这些是**自研编辑器**才装的，
  //      现已不在依赖里；往 optimizeDeps 里写解析不到的包会让 Vite 启动报错。
  //   2. 去掉了 `@tiptap/pm` —— 它**没有根导出**（只有 `@tiptap/pm/state` 这类子路径），
  //      写进 `optimizeDeps.include` 会让 Vite 启动直接失败：
  //      `"." is not exported ... from package .../@tiptap/pm`。
  // `prosemirror-*` 是 `@nuxt/ui` 的传递依赖，apps/* 解析不到，故保留 `@nuxt/ui > ` 前缀。
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
