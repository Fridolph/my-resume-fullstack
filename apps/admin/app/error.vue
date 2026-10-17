<script setup lang="ts">
import { resolveErrorPage } from '~/config/error-pages'

/**
 * 全局错误页（403 / 404 / 401 / 其他）。
 *
 * ## 为什么是**一个**文件而不是 403.vue / 404.vue
 *
 * Nuxt 的错误页只有 `app/error.vue` 这一个入口，按状态码分文件不会被路由命中。
 * 所以真正的做法是：**一个页面 + 一张配置表**（`config/error-pages.ts`），
 * 页面只负责渲染与执行动作，文案与分类都在表里 —— 加一类错误只改表、不改模板。
 *
 * ## 为什么是全屏、不套后台布局
 *
 * 错误页要表达的是"这一步走不通"，此时侧栏与导航会让人以为"后台还活着、只是这块空了"。
 * 全屏 + 居中最省解释成本（参考 greensketch-basic 的 error.vue 形态）。
 * 代价是 403 时没有了侧栏入口 —— 但 403 页给了"返回首页"，回得去。
 *
 * ## 错误码从哪来
 *
 * 约定：路由守卫 / 请求层把后端 `errorCode` 塞进 `statusMessage`。
 * 解析顺序见 `resolveErrorPage`：错误码文案 > 状态码文案 > 兜底。
 */
const error = useError()

const config = computed(() => resolveErrorPage(error.value?.statusCode, error.value?.statusMessage))

/** 只展示最原始的一行技术信息，供排查用；不把整个堆栈摊给用户 */
const technical = computed(() => {
  const statusCode = error.value?.statusCode
  const message = error.value?.message
  if (!statusCode && !message) return ''
  return [statusCode, message].filter(Boolean).join(' · ')
})

useHead(() => ({ title: `${config.value.title} · 管理后台` }))

/**
 * 执行主按钮。
 *
 * 三种去向都走 `clearError()`：
 * - 它是**清掉错误态**的唯一入口，不清的话目标页面仍会渲染错误页；
 * - `redirect` 与 `clearError` 一起用，避免"先 navigate 再清"留下一个已卸载的错误态。
 */
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
  <div class="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
    <UEmpty :icon="config.icon" :title="config.title" :description="config.description" class="max-w-xl">
      <template #default>
        <div class="mt-2 flex flex-col items-center gap-4">
          <UBadge color="neutral" variant="subtle" class="font-mono">{{ config.badge }}</UBadge>

          <p v-if="config.hint" class="text-sm leading-6 text-muted">{{ config.hint }}</p>

          <UButton :label="config.primaryLabel" icon="i-lucide-arrow-left" @click="runPrimaryAction" />

          <p v-if="technical" class="font-mono text-xs text-dimmed">{{ technical }}</p>
        </div>
      </template>
    </UEmpty>
  </div>
</template>
