<script setup lang="ts">
import type { ResumeSectionSummary } from '#layers/public-resume/app/types/resume'

/**
 * 未使用模块托盘（仅编辑态）。
 *
 * 它和三栏共用同一个 sortable group：**拖到这里 = 隐藏**，从托盘拖回任意栏 = 恢复。
 * 另外给一个「点回」按钮，作为拖拽的替代入口（键盘 / 触屏 / 精准操作都方便）。
 *
 * 以 **section id** 为单位（自定义模块多实例，key 区分不开）；名字取清单项自己的 label。
 */
defineProps<{ items: ResumeSectionSummary[] }>()

const emit = defineEmits<{ restore: [id: string] }>()
</script>

<template>
  <section class="grid gap-2">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <p class="resume-eyebrow">未使用模块</p>
      <p class="resume-muted text-xs">拖进任意栏即可恢复 · 把模块拖到此处等于隐藏</p>
    </div>

    <div class="resume-tray" data-slot="tray">
      <div v-for="item in items" :key="item.id" class="resume-tray-item" :data-section-id="item.id">
        <button type="button" data-drag-handle class="resume-tool-btn" :title="`拖拽「${item.label}」回到栏位`">
          <UIcon name="i-lucide-grip-vertical" class="size-4" />
          <span class="sr-only">拖拽</span>
        </button>
        <span class="truncate">{{ item.label }}</span>
        <button
          type="button"
          class="resume-tool-btn"
          :title="`恢复「${item.label}」到默认栏位`"
          @click="emit('restore', item.id)"
        >
          <UIcon name="i-lucide-undo-2" class="size-4" />
          <span class="sr-only">恢复</span>
        </button>
      </div>

      <p v-if="!items.length" class="resume-empty-slot">暂时没有未使用的模块</p>
    </div>
  </section>
</template>
