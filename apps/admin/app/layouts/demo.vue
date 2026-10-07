<script setup lang="ts">
/**
 * demo —— 组件/交互演示布局
 *
 * 一条带 "Demo" 标识的顶部栏 + 居中的内容容器。
 * 适合放组件 playground、设计稿走查页等，与真实业务页隔离。
 */
</script>

<template>
  <div class="min-h-dvh bg-default">
    <header class="sticky top-0 z-20 border-b border-default bg-default/90 backdrop-blur">
      <div class="mx-auto flex h-14  items-center justify-between gap-4 px-4 sm:px-6">
        <div class="flex items-center gap-3">
          <span
            class="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning"
          >
            Demo
          </span>
          <NuxtLink to="/" class="text-sm text-muted hover:text-highlighted">
            ← Back to app
          </NuxtLink>
        </div>

        <slot name="actions" />
      </div>
    </header>

    <main class="mx-auto  px-4 py-6 sm:px-6">
      <slot />
    </main>
  </div>
</template>
