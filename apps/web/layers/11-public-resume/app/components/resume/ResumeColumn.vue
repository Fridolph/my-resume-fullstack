<script setup lang="ts">
import type {
  ResumeContent,
  ResumeDisplayOptions,
  ResumeSectionKey,
  ResumeThemeConfig,
} from '../../types/resume'
import { getSectionDefinition, resumeSectionComponents } from '../../config/resume-sections'

/**
 * 单栏：渲染某个栏位里的有序区块列表。
 *
 * 它只认识「注册表 + 契约」，不认识任何具体区块 —— 加区块不用改这里。
 */
defineProps<{
  keys: ResumeSectionKey[]
  content: ResumeContent
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
}>()
</script>

<template>
  <div class="grid gap-6">
    <component
      :is="resumeSectionComponents[key]"
      v-for="key in keys"
      :key="key"
      :section="getSectionDefinition(key)!"
      :content="content"
      :options="options"
      :theme="theme"
    />
  </div>
</template>
