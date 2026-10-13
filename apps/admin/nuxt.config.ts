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
      /** 401 时请求层把人送到这里（web 端不用跳转，所以不配） */
      loginPath: '/login',
    },
  },
  typescript: { strict: true, typeCheck: true },
  compatibilityDate: '2025-01-01',

  // 注：原先这里有一段 `vite.optimizeDeps.include`，把 prosemirror / @tiptap/* 预打包成
  // 单实例，用来避免 Tiptap 报 "Adding different instances of a keyed plugin"。
  // 随着自研的 TextEditor 组件移除，这段配置已无用处，故一并删除。
  //
  // ⚠️ 将来若重新引入基于 Tiptap 的编辑器（包括直接使用 @nuxt/ui 的编辑器组件），
  // 需要把它加回来，否则可能撞上多实例报错。原先的值是：
  //   '@nuxt/ui > prosemirror-{gapcursor,model,state,tables,transform,view}'
  //   '@tiptap/core'、'@tiptap/vue-3' 及用到的各 @tiptap/extension-*
  //   'highlight.js/lib/languages/{css,javascript,typescript,xml}'、'lowlight'
})
