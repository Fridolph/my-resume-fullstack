import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  $meta: {
    name: 'public-resume',
  },
  // 本域样式：变量默认值 + 语义类（见 app/assets/css/resume.css）
  css: [fileURLToPath(new URL('./app/assets/css/resume.css', import.meta.url))],
})
