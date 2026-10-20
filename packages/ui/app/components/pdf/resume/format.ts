import type { ResumeSection } from '@rs/common'

/**
 * PDF 专用的**纯排版辅助**（不做展示决策，只把契约里的联合类型摊平成可读字符串）。
 *
 * 为什么单独放这里：日期在契约里是 `{ mode: 'custom', text } | { mode: 'structured', ... }`
 * 的联合，屏幕上由各自的组件处理，而纸上只有"一行文字"这一种形态 ——
 * 把分支收在一个函数里，比在 8 个模块组件里各写一遍可靠。
 */

/** 任意 section 的 data（契约里是逐个类型的联合，纸面渲染只读它认识的键） */
export type SectionData = Record<string, unknown>

export function sectionData(section: ResumeSection): SectionData {
  return (section.data ?? {}) as SectionData
}

/** 把 `date` 联合渲染成一行：自定义 → 原文；结构化 → `2020-09 ~ 至今` */
export function formatDate(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const date = value as Record<string, unknown>

  if (date.mode === 'custom') return typeof date.text === 'string' ? date.text : ''

  const start = typeof date.start === 'string' ? date.start : ''
  const end = date.isCurrent ? '至今' : typeof date.end === 'string' ? date.end : ''
  return [start, end].filter(Boolean).join(' ~ ')
}

/** 取第一条非空字符串（模块字段在契约里常见 "多种可能的标题字段"） */
export function firstText(record: SectionData, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/** 取对象数组（`items` / `achievements` / `tech` 这类） */
export function listOf(record: SectionData, key: string): SectionData[] {
  const value = record[key]
  return Array.isArray(value) ? (value.filter(item => item && typeof item === 'object') as SectionData[]) : []
}

/** 取字符串数组（`tech` / `features` / 标签这类，元素可能是 `{ id, text }`） */
export function texts(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === 'string' ? item : item && typeof item === 'object' ? (item as SectionData).text : ''))
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}
