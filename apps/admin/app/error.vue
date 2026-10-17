<script setup lang="ts">
import { resolveErrorPage } from '@rs/common'
import MyErrorPage from '#layers/ui/app/components/MyErrorPage.vue'

/**
 * 全局错误页（admin）。
 *
 * ## 这个文件只做三件**宿主专属**的事
 *
 * 1. 取错误（`useError()`）；
 * 2. 把错误码解析成配置（`resolveErrorPage` —— 纯函数在 `@rs/common`，两端共用）；
 * 3. 执行主按钮去向（`clearError` + 跳哪儿，这是**应用自己的策略**）。
 *
 * 展示与文案都在共享层：`packages/ui` 的 `MyErrorPage` + `packages/common` 的 `resolveErrorPage`。
 * 两端各写一份必然漂移 —— 一边说"页面不存在"、另一边说"找不到资源"，用户会以为是两种问题。
 *
 * ## `clearError` 为什么必须用
 *
 * 它是**清掉错误态**的唯一入口。不清就跳转，目标页面仍会渲染错误页
 *（Nuxt 的错误态是全局的，不是某个页面的局部状态）。
 */
const error = useError()

const config = computed(() => resolveErrorPage(error.value?.statusCode, error.value?.statusMessage))

/** 只展示一行技术信息供排查，不把堆栈摊给用户 */
const technical = computed(() => {
  const statusCode = error.value?.statusCode
  const message = error.value?.message
  if (!statusCode && !message) return ''
  return [statusCode, message].filter(Boolean).join(' · ')
})

useHead(() => ({ title: `${config.value.title} · 管理后台` }))

function runPrimaryAction() {
  switch (config.value.primaryAction) {
    case 'login':
      return clearError({ redirect: '/login' })
    case 'retry':
      // 重新进入当前地址 = 让守卫与数据请求完整重跑一遍
      return clearError({ redirect: useRoute().fullPath })
    default:
      return clearError({ redirect: '/' })
  }
}
</script>

<template>
  <MyErrorPage :config="config" :technical="technical" @primary="runPrimaryAction" />
</template>
