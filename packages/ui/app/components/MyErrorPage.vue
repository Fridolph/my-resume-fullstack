<script setup lang="ts">
import { resolveErrorPage } from '@rs/common'

/**
 * 全局错误页（web 与 admin **同一份实现**）。
 *
 * ## 为什么连"取哪个错误、说哪句话"都放在这里
 *
 * 宿主只需要 `<MyErrorPage />` 一行 —— 两端不再各写一份 error.vue。
 * 代价是这个组件认识 Nuxt 的错误态与 `clearError()`；收益是"错误页只有一处需要改"。
 *
 * ⚠️ props 在这里是一个都没有：错误从 `useError()` 取。
 * 这样也顺带绕开了 `AGENTS.md` §4.6 记录的那个坑 —— `defineProps<外部类型>()` 指向
 * `@rs/common` 时 SFC 编译器不展开包的 re-export 链，dev 会崩。
 * **运行时** import 不受影响（`packages/ui/app/plugins/api.ts` 早就在运行时 import common）。
 *
 * ## 两个按钮（Owner 2026-10-16）
 *
 * 「返回上一页」+「返回主页」，固定不变 —— 状态码只决定**说哪句话**，不决定能点哪儿。
 * 之所以不做"401 去登录"这类差异化按钮：`api:unauthorized` 钩子已经会在 401 时清理会话并跳登录，
 * 走到错误页的 401 是罕见路径，为它多出一条分支不值得。
 *
 * ## 为什么必须 `clearError()`
 *
 * Nuxt 的错误态是**全局**的：只 `navigateTo` 不清错误，目标页面仍会渲染错误页。
 * `clearError({ redirect })` 是"清掉 + 跳过去"的唯一正确入口。
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

useHead(() => ({ title: config.value.title }))

/**
 * 返回上一页。
 *
 * 直接用 `router.back()` 会在"新标签页直接打开某个 URL"时什么都不做（没有历史记录），
 * 用户会以为按钮坏了。所以没有历史时退回主页 —— 两个按钮至少有一个always有效。
 */
function goBack() {
  if (import.meta.client && window.history.length > 1) {
    window.history.back()
    return
  }

  return clearError({ redirect: '/' })
}

function goHome() {
  return clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
    <UEmpty :icon="config.icon" :title="config.title" :description="config.description" class="max-w-xl">
      <!--
        ⚠️ 必须是具名插槽 `#body` —— `UEmpty` **没有默认插槽**（它的插槽是
        header / leading / title / description / body / actions）。
        写成 `<template #default>` 不会报错，但插槽内容**整块消失**：
        页面只剩标题和描述，两个按钮与状态码徽标都不见。
        本仓因此实测踩过一次（curl 打到 404 页只看到"页面不存在"）。
      -->
      <template #body>
        <div class="mt-2 flex flex-col items-center gap-4">
          <UBadge color="neutral" variant="subtle" class="font-mono">{{ config.badge }}</UBadge>

          <p v-if="config.hint" class="text-sm leading-6 text-muted">{{ config.hint }}</p>

          <div class="flex flex-wrap items-center justify-center gap-3">
            <UButton label="返回上一页" icon="i-lucide-undo-2" color="neutral" variant="outline" @click="goBack" />
            <UButton label="返回主页" icon="i-lucide-house" @click="goHome" />
          </div>

          <p v-if="technical" class="font-mono text-xs text-dimmed">{{ technical }}</p>
        </div>
      </template>
    </UEmpty>
  </div>
</template>
