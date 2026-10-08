<script setup lang="ts">
import type { ResumeSectionProps } from '#layers/public-resume/app/types/resume'
import ResumeSectionCard from './ResumeSectionCard.vue'

/** 专业技能：按能力分组展示标签（可视化图表另立任务） */
defineProps<ResumeSectionProps>()
</script>

<template>
  <ResumeSectionCard :section="section" :variant="variant">
    <div v-for="group in content.skills" :key="group.group" class="space-y-2">
      <p class="resume-label">{{ group.group }}</p>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="skill in group.items"
          :key="skill"
          class="rounded px-2 py-1 text-xs"
          :style="{ background: 'var(--resume-chip-bg)', color: 'var(--resume-chip-text)' }"
        >
          {{ skill }}
        </span>
      </div>
    </div>
  </ResumeSectionCard>
</template>
