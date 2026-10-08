<script setup lang="ts">
import type { ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'

/**
 * 工作经历 · 极简。
 *
 * 最克制的一档：一行「公司 · 职位 · 时间」，概述与成果用纯文本列表，
 * 不打标签、不画时间线 —— 让内容本身承担信息，装饰交给外壳 token。
 */
defineProps<ResumeSectionBodyProps>()
</script>

<template>
  <div v-for="item in content.experience" :key="item.company" class="space-y-1">
    <p class="resume-text text-sm font-medium">
      {{ item.company }} · {{ item.role }}
      <span class="resume-muted text-xs">{{ item.period }}</span>
    </p>

    <p v-if="item.overview" class="resume-muted">{{ item.overview }}</p>

    <ul
      v-if="options.showAchievements && item.achievements?.length"
      class="resume-muted list-inside list-disc space-y-0.5"
    >
      <li v-for="line in item.achievements" :key="line">{{ line }}</li>
    </ul>
  </div>
</template>
