<script setup lang="ts">
import type { ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'

/**
 * 工作经历 · 标准（对齐旧站）。
 *
 * 左列时间 + 右侧层级内容（公司 / 职位 · 行业 / 概述 / 成果 / 技术栈），
 * 技术栈用统一的 `.resume-chip` 语义类（不再逐处写 inline 颜色）。
 */
defineProps<ResumeSectionBodyProps>()
</script>

<template>
  <div
    v-for="item in content.experience"
    :key="item.company"
    class="flex flex-col gap-1 sm:flex-row sm:gap-4"
  >
    <p class="resume-muted w-28 shrink-0 text-xs">{{ item.period }}</p>

    <div class="min-w-0 space-y-2">
      <header>
        <p class="resume-text font-medium">{{ item.company }}</p>
        <p class="resume-muted text-xs">
          {{ item.role }}<template v-if="item.domain"> · {{ item.domain }}</template>
        </p>
      </header>

      <p v-if="item.overview" class="resume-muted">{{ item.overview }}</p>

      <ul
        v-if="options.showAchievements && item.achievements?.length"
        class="resume-muted list-inside list-disc space-y-1"
      >
        <li v-for="line in item.achievements" :key="line">{{ line }}</li>
      </ul>

      <div v-if="options.showTechStack && item.tech?.length" class="flex flex-wrap gap-1.5 pt-1">
        <span v-for="tech in item.tech" :key="tech" class="resume-chip px-2 py-0.5">{{ tech }}</span>
      </div>
    </div>
  </div>
</template>
