<script setup lang="ts">
import type { ResumeSectionProps } from '../../types/resume'
import ResumeSectionCard from './ResumeSectionCard.vue'

/** 教育经历：学校 / 时间 / 学位 / 专业 */
defineProps<ResumeSectionProps>()
</script>

<template>
  <ResumeSectionCard :section="section" :variant="variant">
    <div v-for="item in content.education" :key="item.school" class="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <p class="w-32 shrink-0 text-xs" :style="{ color: 'var(--resume-muted)' }">{{ item.period }}</p>
      <div class="min-w-0">
        <p class="font-medium" :style="{ color: 'var(--resume-text)' }">
          {{ item.school }}<span :style="{ color: 'var(--resume-muted)' }"> · {{ item.degree }}</span>
        </p>
        <p v-if="item.major" class="text-xs" :style="{ color: 'var(--resume-muted)' }">{{ item.major }}</p>
      </div>
    </div>
  </ResumeSectionCard>
</template>
