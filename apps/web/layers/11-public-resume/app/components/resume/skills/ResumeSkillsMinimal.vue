<script setup lang="ts">
import type { ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'

/**
 * 专业技能 · 极简。
 *
 * 不做标签墙：每组一行「组名 → 用 · 连接的技能」，信息密度高、视觉最轻。
 */
defineProps<ResumeSectionBodyProps>()
</script>

<template>
  <div v-for="group in content.skills" :key="group.group" class="space-y-1">
    <p class="resume-muted text-xs">{{ group.group }}</p>
    <p class="resume-text text-sm">{{ group.items.join(' · ') }}</p>
  </div>
</template>
