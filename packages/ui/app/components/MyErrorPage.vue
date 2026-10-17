<script setup lang="ts">
import type { ErrorPageConfig } from '@rs/common'

/**
 * 错误页的**展示**（web 与 admin 共用）。
 *
 * ## 边界：它不会跳转
 *
 * `packages/ui` 只描述"能做什么"，不判断"该去哪"（`AGENTS.md` §4.6）。
 * 所以这里只抛一个 `primary` 事件，由宿主的 `error.vue` 决定是 `clearError({ redirect: '/login' })`
 * 还是重试当前地址 —— 两端的宿主策略不同（admin 有登录页与侧栏，web 没有）。
 *
 * ## 为什么全屏、不套布局
 *
 * 错误页要表达的是"这一步走不通"。此时留着侧栏与导航会让人以为"后台还活着、只是这块空了"。
 * 全屏 + 居中最省解释成本。
 */
defineProps<{
  config: ErrorPageConfig
  /** 原始技术信息（状态码 + message），只在有值时展示，供排查用 */
  technical?: string
}>()

defineEmits<{ primary: [] }>()
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
    <UEmpty :icon="config.icon" :title="config.title" :description="config.description" class="max-w-xl">
      <template #default>
        <div class="mt-2 flex flex-col items-center gap-4">
          <UBadge color="neutral" variant="subtle" class="font-mono">{{ config.badge }}</UBadge>

          <p v-if="config.hint" class="text-sm leading-6 text-muted">{{ config.hint }}</p>

          <UButton :label="config.primaryLabel" icon="i-lucide-arrow-left" @click="$emit('primary')" />

          <p v-if="technical" class="font-mono text-xs text-dimmed">{{ technical }}</p>
        </div>
      </template>
    </UEmpty>
  </div>
</template>
