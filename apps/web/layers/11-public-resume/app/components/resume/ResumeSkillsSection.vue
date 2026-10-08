<script setup lang="ts">
import type { Component } from 'vue'
import type { ResumeSectionProps, ResumeStyleId } from '#layers/public-resume/app/types/resume'
import ResumeSectionCard from './ResumeSectionCard.vue'
import ResumeSkillsMinimal from './skills/ResumeSkillsMinimal.vue'
import ResumeSkillsPro from './skills/ResumeSkillsPro.vue'
import ResumeSkillsStandard from './skills/ResumeSkillsStandard.vue'

/**
 * 专业技能 —— **入口薄壳**（与 `ResumeExperienceSection` 同构）。
 *
 * 外壳由 `ResumeSectionCard` 负责，内容按 `variant` 路由到 `skills/` 下的实现。
 * 能力雷达是 hero 的零件，本轮不往 skills 搬（约定：真复用才上提）。
 */
const props = defineProps<ResumeSectionProps>()

const BODY_VARIANTS: Record<ResumeStyleId, Component> = {
  minimal: ResumeSkillsMinimal,
  standard: ResumeSkillsStandard,
  pro: ResumeSkillsPro,
}

const body = computed(() => BODY_VARIANTS[props.variant])
</script>

<template>
  <ResumeSectionCard :section="section" :variant="variant">
    <component :is="body" :content="content" :options="options" :variant="variant" />
  </ResumeSectionCard>
</template>
