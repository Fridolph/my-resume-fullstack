<script setup lang="ts">
import type {
  ResumeContent,
  ResumeDisplayOptions,
  ResumeSectionKey,
  ResumeSlotKey,
  ResumeThemeConfig,
} from '../../types/resume'
import { getSectionDefinition, resumeSectionComponents } from '../../config/resume-sections'

/**
 * 单栏：渲染某个栏位里的有序区块列表。
 *
 * 它只认识「注册表 + 契约」，不认识任何具体区块 —— 加区块不用改这里。
 * 编辑态的拖拽手柄与隐藏按钮也在这层注入：**区块组件本身不感知编辑**，
 * 因此同一份区块组件既能给公开站渲染，也能给 admin 复用。
 */
defineProps<{
  slotKey: ResumeSlotKey
  keys: ResumeSectionKey[]
  content: ResumeContent
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
  editable?: boolean
}>()

const emit = defineEmits<{ hide: [key: ResumeSectionKey]; edit: [key: ResumeSectionKey] }>()
</script>

<template>
  <div class="grid gap-6" :data-slot="slotKey">
    <div v-for="key in keys" :key="key" class="relative" :data-section-key="key">
      <div v-if="editable" class="absolute end-2 top-2 z-10 flex items-center gap-1">
        <button
          type="button"
          class="rounded-md border p-1"
          :style="{
            background: 'var(--resume-surface)',
            borderColor: 'var(--resume-border)',
            color: 'var(--resume-muted)',
          }"
          :title="`编辑「${getSectionDefinition(key)?.label ?? key}」内容`"
          @click="emit('edit', key)"
        >
          <UIcon name="i-lucide-pencil" class="size-4" />
        </button>
        <button
          type="button"
          data-drag-handle
          class="cursor-grab rounded-md border p-1 active:cursor-grabbing"
          :style="{
            background: 'var(--resume-surface)',
            borderColor: 'var(--resume-border)',
            color: 'var(--resume-muted)',
          }"
          :title="`拖拽调整「${getSectionDefinition(key)?.label ?? key}」`"
        >
          <UIcon name="i-lucide-grip-vertical" class="size-4" />
        </button>
        <button
          type="button"
          class="rounded-md border p-1"
          :style="{
            background: 'var(--resume-surface)',
            borderColor: 'var(--resume-border)',
            color: 'var(--resume-muted)',
          }"
          :title="`隐藏「${getSectionDefinition(key)?.label ?? key}」`"
          @click="emit('hide', key)"
        >
          <UIcon name="i-lucide-eye-off" class="size-4" />
        </button>
      </div>

      <component
        :is="resumeSectionComponents[key]"
        :section="getSectionDefinition(key)!"
        :content="content"
        :options="options"
        :theme="theme"
      />
    </div>
  </div>
</template>
