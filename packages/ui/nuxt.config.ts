import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  $meta: {
    name: 'ui',
  },

  // 本层的样式：展示域要用的 `.resume-*` 类与 CSS 变量（原在 web 的 11-public-resume layer）。
  // 搬到共享层是因为 admin 的只读详情页也要这套样式，而两端各自引一份必然会漂移。
  css: [fileURLToPath(new URL('./app/assets/css/resume.css', import.meta.url))],

  // 这是一个**共享 layer**（不是独立应用）：
  // - 由 apps/web、apps/admin 通过 `extends: ['../../packages/ui']` 引入
  // - app/components/** 里的组件在宿主里自动导入（无需 import、无需构建）
  // - 样式类由宿主的 Tailwind 扫描，见各 app 的 main.css 里的 @source
})
