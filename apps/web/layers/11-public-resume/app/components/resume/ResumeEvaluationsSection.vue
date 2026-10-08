<script setup lang="ts">
import type { ResumeSectionProps } from '#layers/public-resume/app/types/resume'
import ResumeSectionCard from './ResumeSectionCard.vue'

/** 自我评价：列表 + 结尾致谢 */
defineProps<ResumeSectionProps>()
</script>

<template>
  <ResumeSectionCard :section="section" :variant="variant">
    <ul class="space-y-2">
      <li v-for="line in content.evaluations" :key="line" class="flex gap-2">
        <UIcon name="i-lucide-check" class="resume-accent mt-1 size-4 shrink-0" />
        <span class="resume-muted">{{ line }}</span>
      </li>
    </ul>
    <p
      v-if="content.footerNote"
      class="border-t pt-3 text-xs"
      :style="{ borderColor: 'var(--resume-border)', color: 'var(--resume-muted)' }"
    >
      {{ content.footerNote }}
    </p>
  </ResumeSectionCard>
</template>
