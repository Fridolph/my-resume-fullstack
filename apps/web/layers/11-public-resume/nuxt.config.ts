import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  $meta: {
    name: 'public-resume',
  },

  // 样式（`.resume-*` 类与 CSS 变量）已随展示组件一起上提到 `packages/ui`（DAO-034 批 2），
  // 由 ui 的 nuxt.config 引入 —— 这里不再重复引，避免两端各一份。

  alias: {
    // 展示域类型已上提到 `@rs/common`（DAO-034）。这里让**原来的引用路径直达源码定义**：
    // Vue 的 `defineProps<整个类型>()` 需要编译器"看到定义"，而它不会展开包的 re-export 链
    // （`@rs/common` 的 dist 入口是一串 `export *`）—— 指向源码即可解析，且 40+ 处引用一行不用改。
    '#layers/public-resume/app/types/resume': fileURLToPath(
      new URL('../../../../packages/common/src/resume/content.ts', import.meta.url),
    ),
  },
})
