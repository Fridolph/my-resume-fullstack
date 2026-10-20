import type { Component } from 'vue'
import type { ResumeSection } from '@rs/common'
import PdfProfileBlock from './PdfProfileBlock.vue'
import PdfListBlock from './PdfListBlock.vue'
import PdfCustomBlock from './PdfCustomBlock.vue'

/**
 * `section.type` → 纸面组件（**唯一的注册表**）。
 *
 * 与展示层的 `resume-section-components.ts` 同构：加一个模块类型 = 两边各加一行，
 * 而不是在渲染器里加分支。PDF 版式与屏幕版式**必须**能各自演化 ——
 * 所以这里是独立的一张表，不共享展示层那张（共享会让"给纸面调密度"变成"改屏幕"）。
 */
export interface PdfSectionEntry {
  /** 纸面上的列表形态（`plain` 无日期、`dated` 有日期、`rich` 带要点） */
  variant?: 'plain' | 'dated' | 'rich'
}

export const pdfSectionComponents: Record<string, { component: Component; variant?: PdfSectionEntry['variant'] }> = {
  profile: { component: PdfProfileBlock },
  highlights: { component: PdfListBlock, variant: 'plain' },
  education: { component: PdfListBlock, variant: 'dated' },
  experience: { component: PdfListBlock, variant: 'rich' },
  projects: { component: PdfListBlock, variant: 'rich' },
  capabilities: { component: PdfListBlock, variant: 'plain' },
  evaluations: { component: PdfListBlock, variant: 'rich' },
  custom: { component: PdfCustomBlock },
}

/** 未知类型不渲染（并保持页面不崩）：契约新增模块时，纸面先"少一块"而不是整页白屏 */
export function resolvePdfSection(section: ResumeSection) {
  return pdfSectionComponents[section.type]
}
