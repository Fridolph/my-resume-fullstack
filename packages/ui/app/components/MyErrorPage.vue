<script setup lang="ts">
/**
 * 错误页的**展示**（web 与 admin 共用）。
 *
 * ## 为什么 props 是一组扁平的原始值，而不是 `ErrorPageConfig`
 *
 * 因为 `ErrorPageConfig` 定义在 `@rs/common` —— 而 **SFC 编译器不展开包的 re-export 链**，
 * `defineProps<外部类型>()` 在 dev 下会直接崩（`AGENTS.md` §4.6 记录的坑，本仓踩过）。
 * 所以 props 类型**在 ui 内定义**；宿主的 `error.vue` 负责把配置逐项绑上来。
 * 顺带的好处：这个组件不知道自己服务于"错误码体系"，只知道自己要画一张告知页。
 *
 * ## 边界：它不会跳转
 *
 * `packages/ui` 只描述"能做什么"，不判断"该去哪"。所以这里只抛 `primary` 事件，
 * 由宿主决定是 `clearError({ redirect: '/login' })` 还是重试当前地址 ——
 * 两端策略不同（admin 有登录页，web 没有）。
 *
 * ## 为什么全屏、不套布局
 *
 * 错误页要表达的是"这一步走不通"。此时留着侧栏与导航会让人以为"后台还活着、只是这块空了"。
 */
defineProps<{
  /** 顶部状态码徽标，如 `403` */
  badge: string
  /** Nuxt UI 图标名 */
  icon: string
  title: string
  description: string
  /** 一句话补充；没有就不渲染 */
  hint?: string
  /** 主按钮文案 */
  primaryLabel: string
  /** 原始技术信息（状态码 + message）；没有就不渲染 */
  technical?: string
}>()

defineEmits<{ primary: [] }>()
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
    <UEmpty :icon="icon" :title="title" :description="description" class="max-w-xl">
      <template #default>
        <div class="mt-2 flex flex-col items-center gap-4">
          <UBadge color="neutral" variant="subtle" class="font-mono">{{ badge }}</UBadge>

          <p v-if="hint" class="text-sm leading-6 text-muted">{{ hint }}</p>

          <UButton :label="primaryLabel" icon="i-lucide-arrow-left" @click="$emit('primary')" />

          <p v-if="technical" class="font-mono text-xs text-dimmed">{{ technical }}</p>
        </div>
      </template>
    </UEmpty>
  </div>
</template>
