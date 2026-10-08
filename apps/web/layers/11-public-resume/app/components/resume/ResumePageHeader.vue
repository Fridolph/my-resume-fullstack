<script setup lang="ts">
import type { ResumeBrandConfig } from '#layers/public-resume/app/types/resume'

/**
 * 页面头：只排版，不做业务。
 *
 * - 左：品牌区（logo / 标题 / 描述）—— 值由页面算好，未配置时已回退预设
 * - 中：正文滚动时的当前模块名（`activeSectionTitle` 为空则隐藏，回到顶部恢复品牌感）
 * - 右：操作位，由页面通过 `#actions` 插槽传入
 */
withDefaults(
  defineProps<{
    /** 已解析好的品牌信息（logoText / title 一定有值） */
    brand: ResumeBrandConfig & { logoText: string; title: string }
    activeSectionTitle?: string
  }>(),
  { activeSectionTitle: '' },
)
</script>

<template>
  <div
    class="sticky top-0 z-20 border-b backdrop-blur"
    :style="{
      borderColor: 'var(--resume-border)',
      background: 'color-mix(in srgb, var(--resume-surface) 88%, transparent)',
    }"
  >
    <div class="content-max flex items-center gap-4 px-4 py-3 sm:px-6">
      <NuxtLink to="/resume" class="flex min-w-0 items-center gap-3" :aria-label="brand.title">
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white"
          :style="{
            background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))`,
          }"
        >
          <img
            v-if="brand.logoUrl"
            :src="brand.logoUrl"
            :alt="brand.title"
            class="size-6 object-contain"
          />
          <span v-else>{{ brand.logoText }}</span>
        </span>

        <span class="min-w-0">
          <span
            class="resume-text block truncate text-sm font-medium"
          >
            {{ brand.title }}
          </span>
          <span
            v-if="brand.description"
            class="resume-muted block truncate text-xs"
          >
            {{ brand.description }}
          </span>
        </span>
      </NuxtLink>

      <p
        aria-live="polite"
        class="resume-accent hidden min-w-0 flex-1 truncate text-center text-sm font-medium transition-opacity duration-200 sm:block"
        :class="activeSectionTitle ? 'opacity-100' : 'opacity-0'"
      >
        {{ activeSectionTitle }}
      </p>

      <div class="ms-auto flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
