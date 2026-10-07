<script setup lang="ts">
import type { ResumeSectionProps } from '../../types/resume'
import ResumeSectionCard from './ResumeSectionCard.vue'

/** 核心竞争力：列表 + 说明 */
defineProps<ResumeSectionProps>()
</script>

<template>
  <ResumeSectionCard :section="section">
    <ul class="space-y-3">
      <li v-for="item in content.highlights" :key="item.title" class="flex gap-3">
        <span
          class="mt-1.5 size-1.5 shrink-0 rounded-full"
          :style="{ background: 'var(--resume-primary)' }"
        />
        <p>
          <span class="font-medium" :style="{ color: 'var(--resume-text)' }">{{ item.title }}</span>
          <span :style="{ color: 'var(--resume-muted)' }">：{{ item.description }}</span>
        </p>
      </li>
    </ul>
  </ResumeSectionCard>
</template>
