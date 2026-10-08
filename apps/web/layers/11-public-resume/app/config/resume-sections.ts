import type { Component } from 'vue'

import type { ResumeSectionKey, ResumeSlotKey } from '#layers/public-resume/app/types/resume'

import ResumeEducationSection from '#layers/public-resume/app/components/resume/ResumeEducationSection.vue'
import ResumeEvaluationsSection from '#layers/public-resume/app/components/resume/ResumeEvaluationsSection.vue'
import ResumeExperienceSection from '#layers/public-resume/app/components/resume/ResumeExperienceSection.vue'
import ResumeHeroCard from '#layers/public-resume/app/components/resume/ResumeHeroCard.vue'
import ResumeHighlightsSection from '#layers/public-resume/app/components/resume/ResumeHighlightsSection.vue'
import ResumeProjectsSection from '#layers/public-resume/app/components/resume/ResumeProjectsSection.vue'
import ResumeSkillsSection from '#layers/public-resume/app/components/resume/ResumeSkillsSection.vue'

/** 区块定义：决定它叫什么、放哪一栏、默认第几个出现 */
export interface ResumeSectionDefinition {
  key: ResumeSectionKey
  label: string
  icon: string
  /** 默认归属栏位（配置里的 `sections.slot` 可覆盖它） */
  defaultSlot: ResumeSlotKey
  /** 默认顺序（配置未列出该 key 时用它兜底） */
  defaultOrder: number
}

/**
 * 区块注册表 —— **新增区块只改这里 + 写组件**，渲染器不认识任何具体区块。
 *
 * 约定：每个区块组件接收同一组 props（section / content / options / theme），
 * 具体契约见 `ResumeSectionProps`（`components/resume/ResumeSectionCard.vue` 的 props 说明）。
 */
export const resumeSectionDefinitions: ResumeSectionDefinition[] = [
  {
    key: 'profile',
    label: '基本信息',
    icon: 'i-lucide-user-round',
    defaultSlot: 'side',
    defaultOrder: 0,
  },
  {
    key: 'highlights',
    label: '核心竞争力',
    icon: 'i-lucide-sparkles',
    defaultSlot: 'main',
    defaultOrder: 1,
  },
  {
    key: 'education',
    label: '教育经历',
    icon: 'i-lucide-graduation-cap',
    defaultSlot: 'main',
    defaultOrder: 2,
  },
  {
    key: 'experience',
    label: '工作经历',
    icon: 'i-lucide-briefcase-business',
    defaultSlot: 'main',
    defaultOrder: 3,
  },
  {
    key: 'projects',
    label: '核心项目经历',
    icon: 'i-lucide-folder-code',
    defaultSlot: 'main',
    defaultOrder: 4,
  },
  {
    key: 'skills',
    label: '专业技能',
    icon: 'i-lucide-wrench',
    defaultSlot: 'main',
    defaultOrder: 5,
  },
  // 三栏模式才用得上右栏；单栏 / 左右模式下 rail 会并入中栏
  {
    key: 'evaluations',
    label: '自我评价',
    icon: 'i-lucide-quote',
    defaultSlot: 'rail',
    defaultOrder: 6,
  },
]

export const resumeSectionComponents: Record<ResumeSectionKey, Component> = {
  profile: ResumeHeroCard,
  highlights: ResumeHighlightsSection,
  education: ResumeEducationSection,
  experience: ResumeExperienceSection,
  projects: ResumeProjectsSection,
  skills: ResumeSkillsSection,
  evaluations: ResumeEvaluationsSection,
}

export function getSectionDefinition(key: ResumeSectionKey): ResumeSectionDefinition | undefined {
  return resumeSectionDefinitions.find(definition => definition.key === key)
}
