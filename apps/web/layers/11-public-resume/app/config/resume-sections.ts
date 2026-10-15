import type { Component } from 'vue'
import type { ResumeSectionKey } from '@rs/common'

import ResumeEducationSection from '#layers/ui/app/components/resume/ResumeEducationSection.vue'
import ResumeEvaluationsSection from '#layers/ui/app/components/resume/ResumeEvaluationsSection.vue'
import ResumeExperienceSection from '#layers/ui/app/components/resume/ResumeExperienceSection.vue'
import ResumeHeroCard from '#layers/ui/app/components/resume/ResumeHeroCard.vue'
import ResumeHighlightsSection from '#layers/ui/app/components/resume/ResumeHighlightsSection.vue'
import ResumeProjectsSection from '#layers/ui/app/components/resume/ResumeProjectsSection.vue'
import ResumeSkillsSection from '#layers/ui/app/components/resume/ResumeSkillsSection.vue'

/**
 * 区块定义与键名桥接（`resumeSectionDefinitions` / `getSectionDefinition` / `toLegacySectionKey`）
 * 已上提到 **`@rs/common`** 的 `resume/sections.ts`（DAO-034）—— 展示注册表与 admin 的只读容器
 * 都要用同一份定义。这里转发是为了 web 内部既有引用不动。
 *
 * 本文件只保留**组件注册表**：它引用本 layer 的展示组件，组件本身在批 2 才上提
 * （上提后这张表会跟着组件一起搬到 `packages/ui`）。
 */
export { getSectionDefinition, resumeSectionDefinitions, toLegacySectionKey } from '@rs/common'
export type { ResumeSectionDefinition } from '@rs/common'

// 组件注册表已随展示组件上提到 `packages/ui`（DAO-034 批 2）；这里转发，保持 web 内部引用不变。
export { resumeSectionComponents } from '#layers/ui/app/config/resume-section-components'
