import { fileURLToPath } from 'node:url'
import { defineRsNuxtConfig } from '@rs/config'

/**
 * `apps/web` 的 Nuxt 配置。
 *
 * 构建基线（模块、样式入口、图标、TypeScript、sourcemap、安全头、Tiptap 单实例预打包、
 * 版本与提交号注入）全部来自 `@rs/config` 的 `defineRsNuxtConfig()` —— 与 `apps/admin` 共用一份。
 * 本文件只保留 **web 端独有**的部分。
 */
export default defineRsNuxtConfig(
  { name: 'web', from: import.meta.url },
  {
    // 跨 app 共享 UI 组件（Nuxt layer，见 packages/ui/README.md）
    extends: ['../../packages/ui'],

    // 展示域类型（`ResumeContent` 等）的**源码定义**入口。
    //
    // ⚠️ 本层组件用 `defineProps<ResumeSectionProps>()` 这种"整块外部类型"时，
    // Vue 的 SFC 编译器**不会展开包的 re-export 链**（`@rs/common` 的 dist 入口是一串 `export *`）——
    // `typecheck` / `build` 都不报，**只有 dev 的 SFC 编译会炸**。指向源码即可解析。
    // 只能写在宿主（本文件），不能写在 layer：layer 的 alias 不参与宿主上下文的解析。
    //
    // 这条是**业务 alias**，所以刻意不放进 `@rs/config`：底座不认识展示域。
    alias: {
      '#rs/resume-content': fileURLToPath(new URL('../../packages/common/src/resume/content.ts', import.meta.url)),
    },
  },
)
