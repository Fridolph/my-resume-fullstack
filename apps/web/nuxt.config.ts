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
})
