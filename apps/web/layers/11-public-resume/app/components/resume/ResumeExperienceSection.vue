<script setup lang="ts">
import type { Component } from 'vue'
import type { ResumeSectionProps, ResumeStyleId } from '#layers/public-resume/app/types/resume'
import ResumeSectionCard from './ResumeSectionCard.vue'
import ResumeExperienceMinimal from './experience/ResumeExperienceMinimal.vue'
import ResumeExperiencePro from './experience/ResumeExperiencePro.vue'
import ResumeExperienceStandard from './experience/ResumeExperienceStandard.vue'

/**
 * 工作经历 —— **入口薄壳**。
 *
 * 分工：外壳（卡片表面 + 标题行）由 `ResumeSectionCard` 统一负责，
 * 这里只按 `variant` 把**内容部分**路由到 `experience/` 下的对应实现。
 *
 * 与 hero 薄壳的差别：hero 不用 `ResumeSectionCard`（它自带排版），所以那边薄壳自己挂外壳。
 * 对外契约（`ResumeSectionProps` / 注册表 / 编辑与拖拽注入）三档完全一致 —— 拆的只是内部实现。
 */
const props = defineProps<ResumeSectionProps>()

const BODY_VARIANTS: Record<ResumeStyleId, Component> = {
  minimal: ResumeExperienceMinimal,
  standard: ResumeExperienceStandard,
  pro: ResumeExperiencePro,
}

const body = computed(() => BODY_VARIANTS[props.variant])
</script>

<template>
  <ResumeSectionCard :section="section" :variant="variant">
    <component :is="body" :content="content" :options="options" :variant="variant" />
  </ResumeSectionCard>
</template>
