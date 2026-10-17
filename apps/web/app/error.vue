<script setup lang="ts">
import MyErrorPage from '#layers/ui/app/components/MyErrorPage.vue'

/**
 * 全局错误页入口。
 *
 * Nuxt 只认**应用根目录**的 `app/error.vue`（layer 里的 error.vue 不作为错误页入口），
 * 所以这个文件必须存在；但它只有一行 —— 实现全在 `packages/ui` 的 `MyErrorPage` 里，
 * 两端共用同一份（取错误、文案映射、两个按钮、`clearError`）。
 */
</script>

<template>
  <MyErrorPage />
</template>
