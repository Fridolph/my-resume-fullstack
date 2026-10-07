<script setup lang="ts">
import type { ResumeSectionProps } from '../../types/resume'
import ResumeSectionCard from './ResumeSectionCard.vue'

/** 项目经历：概览 / 核心功能 / 亮点难点 / 技术栈 */
defineProps<ResumeSectionProps>()
</script>

<template>
  <ResumeSectionCard :section="section" :variant="variant">
    <article v-for="item in content.projects" :key="item.name" class="space-y-2">
      <header class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="font-medium" :style="{ color: 'var(--resume-text)' }">
          {{ item.name }}
          <span class="text-xs font-normal" :style="{ color: 'var(--resume-muted)' }">· {{ item.role }}</span>
        </p>
        <p class="text-xs" :style="{ color: 'var(--resume-muted)' }">{{ item.period }}</p>
      </header>

      <p v-if="item.overview" :style="{ color: 'var(--resume-muted)' }">{{ item.overview }}</p>

      <div v-if="item.features?.length" class="flex flex-wrap gap-1.5">
        <span
          v-for="feature in item.features"
          :key="feature"
          class="rounded px-2 py-0.5 text-xs"
          :style="{ background: 'var(--resume-chip-bg)', color: 'var(--resume-chip-text)' }"
        >
          {{ feature }}
        </span>
      </div>

      <ul v-if="options.showAchievements && item.highlights?.length" class="list-inside list-disc space-y-1">
        <li v-for="line in item.highlights" :key="line" :style="{ color: 'var(--resume-muted)' }">{{ line }}</li>
      </ul>

      <div v-if="options.showTechStack && item.tech?.length" class="flex flex-wrap gap-1.5">
        <span class="text-xs" :style="{ color: 'var(--resume-muted)' }">技术栈：</span>
        <span
          v-for="tech in item.tech"
          :key="tech"
          class="rounded px-2 py-0.5 text-xs"
          :style="{ background: 'var(--resume-chip-bg)', color: 'var(--resume-chip-text)' }"
        >
          {{ tech }}
        </span>
      </div>
    </article>
  </ResumeSectionCard>
</template>
