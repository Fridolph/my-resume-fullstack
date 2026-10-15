import type { ResumeSectionKey } from '@rs/common'
import type { Component } from 'vue'

import CapabilitySection from '../components/resume/CapabilitySection.vue'
import ResumeEducationSection from '../components/resume/ResumeEducationSection.vue'
import ResumeEvaluationsSection from '../components/resume/ResumeEvaluationsSection.vue'
import ResumeExperienceSection from '../components/resume/ResumeExperienceSection.vue'
import ResumeHeroCard from '../components/resume/ResumeHeroCard.vue'
import ResumeHighlightsSection from '../components/resume/ResumeHighlightsSection.vue'
import ResumeProjectsSection from '../components/resume/ResumeProjectsSection.vue'
import ResumeSkillsSection from '../components/resume/ResumeSkillsSection.vue'

/**
 * 区块注册表：区块 key → 渲染组件。
 *
 * 随展示组件一起上提到 `packages/ui`（DAO-034 批 2）：谁要"按区块种类渲染"，谁就需要它 ——
 * 公开站、草稿工作台、admin 的只读详情页。留在某一端的 layer 里，另一端就只能自己再抄一份。
 *
 * 注意 key 用**展示层的键名**（`skills` 而非契约的 `capabilities`），
 * 翻译在 `@rs/common` 的 `toLegacySectionKey`，两层的键名差异见那里的说明。
 */
export const resumeSectionComponents: Record<ResumeSectionKey, Component> = {
  profile: ResumeHeroCard,
  highlights: ResumeHighlightsSection,
  education: ResumeEducationSection,
  experience: ResumeExperienceSection,
  projects: ResumeProjectsSection,
  skills: ResumeSkillsSection,
  evaluations: ResumeEvaluationsSection,
}
