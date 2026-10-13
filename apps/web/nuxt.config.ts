import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // 图标：默认会自动发现本地安装的 `@iconify-json/*` 集（lucide、ri …），
  // 再加上这里的**本地 svg 目录** —— 三者共用同一套类名约定：
  //   i-lucide-*      Lucide（Nuxt UI 默认集）
  //   i-ri-*          Remix Icon（@iconify-json/ri，已安装）
  //   其他 iconify 集  装一个 @iconify-json/<集名> 就能用 i-<集名>-*
  //   i-local:*       app/assets/icons/*.svg 里的本地图标（文件名即图标名）
  icon: {
    customCollections: [
      { prefix: 'local', dir: './app/assets/icons' },
    ],
  },


  // 跨 app 共享 UI 组件（Nuxt layer，见 packages/ui/README.md）
  extends: ['../../packages/ui'],
  srcDir: 'app',
  modules: ['@nuxt/ui', '@pinia/nuxt', '@pinia/colada-nuxt'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4049/api',
    },
  },
  typescript: { strict: true, typeCheck: true },
  compatibilityDate: '2025-01-01',
})
