<script setup lang="ts">
import type { ResumeSectionKey } from '#layers/public-resume/app/types/resume'
import { getSectionDefinition } from '#layers/public-resume/app/config/resume-sections'

/**
 * 未使用模块托盘（仅编辑态）。
 *
 * 它和三栏共用同一个 sortable group：**拖到这里 = 隐藏**，从托盘拖回任意栏 = 恢复。
 * 另外给一个「点回」按钮，作为拖拽的替代入口（键盘 / 触屏 / 精准操作都方便）。
 */
defineProps<{ keys: ResumeSectionKey[] }>()

const emit = defineEmits<{ restore: [key: ResumeSectionKey] }>()

function labelOf(key: ResumeSectionKey) {
  return getSectionDefinition(key)?.label ?? key
}
</script>

<template>
  <section class="grid gap-2">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <p class="resume-eyebrow">未使用模块</p>
      <p class="resume-muted text-xs">拖进任意栏即可恢复 · 把模块拖到此处等于隐藏</p>
    </div>

    <div class="resume-tray" data-slot="tray">
      <div v-for="key in keys" :key="key" class="resume-tray-item" :data-section-key="key">
        <button type="button" data-drag-handle class="resume-tool-btn" :title="`拖拽「${labelOf(key)}」回到栏位`">
          <UIcon name="i-lucide-grip-vertical" class="size-4" />
          <span class="sr-only">拖拽</span>
        </button>
        <span class="truncate">{{ labelOf(key) }}</span>
        <button
          type="button"
          class="resume-tool-btn"
          :title="`恢复「${labelOf(key)}」到默认栏位`"
          @click="emit('restore', key)"
        >
          <UIcon name="i-lucide-undo-2" class="size-4" />
          <span class="sr-only">恢复</span>
        </button>
      </div>

      <p v-if="!keys.length" class="resume-empty-slot">暂时没有未使用的模块</p>
    </div>
  </section>
</template>
