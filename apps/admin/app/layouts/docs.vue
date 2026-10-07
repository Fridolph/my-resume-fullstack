<script setup lang="ts">
/**
 * docs —— 文档/说明类页面通用布局
 * 结构：顶部 sticky 返回条 + 居中可滚动内容区。
 * 配合页面里的锚点（`#section`）做页内跳转（全局 scroll-behavior: smooth）。
 */
</script>

<template>
  <div class="min-h-dvh bg-default">
    <header class="sticky top-0 z-20 border-b border-default bg-default/90 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            to="/"
            aria-label="Back to app"
          />
          <span class="text-sm text-muted">Back to app</span>
        </div>

        <slot name="actions" />
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <slot />
    </main>
  </div>
</template>
