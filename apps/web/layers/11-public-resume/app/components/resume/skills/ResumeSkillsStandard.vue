<script setup lang="ts">
import type { ResumeSectionBodyProps } from "#layers/public-resume/app/types/resume";

/**
 * 专业技能 · 标准。
 *
 * 分组名 + 标签墙（`.resume-chip` 语义类），一眼能扫出能力覆盖面。
 */
defineProps<ResumeSectionBodyProps>();
</script>

<template>
  <div v-for="group in content.skills" :key="group.group" class="space-y-2">
    <p class="resume-label">{{ group.group }}</p>
    <div class="flex flex-wrap gap-1.5">
      <span v-for="skill in group.items" :key="skill" class="resume-chip px-2 py-1">{{
        skill
      }}</span>
    </div>
  </div>
</template>
