<script setup lang="ts">
/**
 * 页面顶栏：只负责「身份 + 操作位」的排版。
 *
 * 操作按钮不放这里，而是由页面通过 `#actions` 插槽传入 ——
 * 这样顶栏不依赖任何业务动作，页面也一眼能看出操作从哪来。
 */
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div
    class="sticky top-0 z-20 border-b backdrop-blur"
    :style="{
      borderColor: 'var(--resume-border, #e2e8f0)',
      background: 'color-mix(in srgb, var(--resume-surface, #fff) 88%, transparent)',
    }"
  >
    <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <div class="min-w-0">
        <p class="truncate text-sm font-medium" :style="{ color: 'var(--resume-text, #0f172a)' }">
          {{ title }}
        </p>
        <p v-if="subtitle" class="truncate text-xs" :style="{ color: 'var(--resume-muted, #64748b)' }">
          {{ subtitle }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>
