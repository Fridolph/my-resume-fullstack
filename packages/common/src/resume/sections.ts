/**
 * 简历区块的**共享定义**：区块叫什么、放哪一栏、默认第几个出现，以及两层键名的桥接。
 *
 * 从 `apps/web/layers/11-public-resume/app/config/resume-sections.ts` 上提到这里（DAO-034）：
 * 展示组件注册表与 admin 的只读容器都要用同一份定义，两处各写一份必然漂移。
 *
 * ⚠️ 本文件**不含组件**（组件注册表在 `packages/ui`）—— 这样它才是纯数据、可脱离 Vue 运行。
 */

import type { ResumeSectionKey, ResumeSlotKey } from './content.js'

/**
 * 契约层的模块类型键 → 编辑/展示层的历史键。
 *
 * ⚠️ **这不是冗余，请不要删**。两层的键名**有意不同**：
 * - 契约层（`packages/common` / 数据库 / API）用 `capabilities` —— DAO-028 定的名，
 *   因为语义已从「字符串技能列表」变成「分组 + 条目 + 自评维度」，改名是必要的；
 * - 编辑/展示层（本目录的类型、配置、组件、mock）沿用历史的 `skills` ——
 *   改它要动 `ResumeSectionKey` 类型、区块配置、4 个展示组件与 mock 数据，
 *   收益不抵风险。
 *
 * 两层的桥接**只保留在这一个函数里**：以前这条映射在 `resume-document.ts` 与
 * `ResumeDraftPreview.vue` 里各写了一遍（其中两处是内联三元），一旦契约再改名
 * 很容易漏改，而且不会报编译错（`skills` 本身是合法字符串）。
 */
export function toLegacySectionKey(type: string): ResumeSectionKey {
  return (type === 'capabilities' ? 'skills' : type) as ResumeSectionKey
}

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

export function getSectionDefinition(key: ResumeSectionKey): ResumeSectionDefinition | undefined {
  return resumeSectionDefinitions.find(definition => definition.key === key)
}
