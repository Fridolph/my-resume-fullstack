export default defineNuxtConfig({
  $meta: {
    name: 'ui',
  },
  // 这是一个**共享 layer**（不是独立应用）：
  // - 由 apps/web、apps/admin 通过 `extends: ['../../packages/ui']` 引入
  // - app/components/** 里的组件在宿主里自动导入（无需 import、无需构建）
  // - 样式类由宿主的 Tailwind 扫描，见各 app 的 main.css 里的 @source
})
