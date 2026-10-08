<script setup lang="ts">
import type { ResumeSectionProps } from '#layers/public-resume/app/types/resume'
import ResumeSectionCard from './ResumeSectionCard.vue'

/** 工作经历：公司 / 时间 / 角色 / 概述 / 成果 / 技术栈（后两者受展示开关控制） */
defineProps<ResumeSectionProps>()
</script>

<template>
  <ResumeSectionCard :section="section" :variant="variant">
    <article v-for="item in content.experience" :key="item.company" class="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <p class="resume-muted w-32 shrink-0 text-xs">{{ item.period }}</p>
      <div class="min-w-0 space-y-2">
        <header>
          <p class="resume-text font-medium">{{ item.company }}</p>
          <p class="resume-muted text-xs">
            {{ item.role }}<template v-if="item.domain"> · {{ item.domain }}</template>
          </p>
        </header>

        <p v-if="item.overview"class="resume-muted">{{ item.overview }}</p>

        <ul v-if="options.showAchievements && item.achievements?.length" class="list-inside list-disc space-y-1">
          <li v-for="line in item.achievements" :key="line"class="resume-muted">
            {{ line }}
          </li>
        </ul>

        <div v-if="options.showTechStack && item.tech?.length" class="flex flex-wrap gap-1.5 pt-1">
          <span
            v-for="tech in item.tech"
            :key="tech"
            class="rounded px-2 py-0.5 text-xs"
            :style="{ background: 'var(--resume-chip-bg)', color: 'var(--resume-chip-text)' }"
          >
            {{ tech }}
          </span>
        </div>
      </div>
    </article>
  </ResumeSectionCard>
</template>
