/**
 * 简历 mock 数据 + 对比字段配置（demo 用）。
 *
 * 对应 greensketch 的 option / showFields：
 * - `Resume` 相当于一份 option（多份简历版本）
 * - `ResumeCompareField` 相当于 showFields（对比弹窗按此逐行渲染，可自定义分组、取值、最优高亮）
 */

export interface Resume {
  id: number
  name: string
  /** 状态：draft 草稿 / final 定稿 / archived 归档 */
  status: 'draft' | 'final' | 'archived'
  updatedAt: string
  targetRole: string
  yearsOfExperience: number
  expectedSalary: number
  location: string
  education: string
  skillsCount: number
  latestCompany: string
  noticePeriod: string
  projectsCount: number
  summary: string
}

/** 对比弹窗的字段配置：section（分组标题）或 row（数据行） */
export type ResumeCompareField =
  | { title: string; icon?: string }
  | {
      name: string | ((opt: Resume) => string)
      key?: string
      value?: (opt: Resume) => string
      /** 自动高亮最优值：min 取最小，max 取最大；所有值相同时不高亮 */
      best?: 'min' | 'max'
      hide?: boolean
      subtext?: (opt: Resume) => string
    }

export const RESUMES: Resume[] = [
  {
    id: 1,
    name: '前端工程师 · 基础版',
    status: 'draft',
    updatedAt: '2026-10-04',
    targetRole: '前端开发工程师',
    yearsOfExperience: 3,
    expectedSalary: 18,
    location: '杭州',
    education: '本科',
    skillsCount: 6,
    latestCompany: '某科技公司',
    noticePeriod: '1 个月',
    projectsCount: 4,
    summary: 'Vue/Nuxt 方向，偏业务交付。',
  },
  {
    id: 2,
    name: '前端工程师 · 进阶版',
    status: 'final',
    updatedAt: '2026-10-06',
    targetRole: '高级前端工程师',
    yearsOfExperience: 5,
    expectedSalary: 28,
    location: '上海',
    education: '本科',
    skillsCount: 12,
    latestCompany: '某互联网大厂',
    noticePeriod: '2 周',
    projectsCount: 8,
    summary: '组件库 / 工程化方向，带过小组。',
  },
  {
    id: 3,
    name: '全栈工程师 · 海外版',
    status: 'draft',
    updatedAt: '2026-10-05',
    targetRole: '全栈工程师',
    yearsOfExperience: 6,
    expectedSalary: 35,
    location: '远程',
    education: '硕士',
    skillsCount: 15,
    latestCompany: '某出海公司',
    noticePeriod: '1 个月',
    projectsCount: 10,
    summary: 'Node/Deno + Vue，英文可协作。',
  },
  {
    id: 4,
    name: '前端负责人 · 管理版',
    status: 'archived',
    updatedAt: '2026-09-20',
    targetRole: '前端技术负责人',
    yearsOfExperience: 8,
    expectedSalary: 45,
    location: '深圳',
    education: '硕士',
    skillsCount: 18,
    latestCompany: '某独角兽',
    noticePeriod: '1 个月',
    projectsCount: 15,
    summary: '带团队 + 架构设计。',
  },
  {
    id: 5,
    name: '前端工程师 · 应届版',
    status: 'draft',
    updatedAt: '2026-10-01',
    targetRole: '前端开发实习生',
    yearsOfExperience: 1,
    expectedSalary: 10,
    location: '杭州',
    education: '本科',
    skillsCount: 4,
    latestCompany: '—',
    noticePeriod: '随时',
    projectsCount: 3,
    summary: '应届，有开源与课程项目。',
  },
]

/** 状态 → 徽标样式（label + 颜色 class），供 tab 与对比弹窗复用 */
export const RESUME_STATUS_META: Record<Resume['status'], { label: string; class: string }> = {
  draft: { label: '草稿', class: 'bg-neutral-100 text-neutral-600' },
  final: { label: '定稿', class: 'bg-emerald-100 text-emerald-700' },
  archived: { label: '归档', class: 'bg-orange-100 text-orange-700' },
}

const money = (n: number) => `${n}k`

/** 对比字段：group 标题行 + 数据行；best 指定 min/max 自动高亮 */
export const RESUME_COMPARE_FIELDS: ResumeCompareField[] = [
  { title: '求职定位', icon: 'i-lucide-crosshair' },
  { name: '目标岗位', key: 'targetRole' },
  { name: '工作年限', value: o => `${o.yearsOfExperience} 年`, best: 'max' },
  {
    name: '期望薪资',
    value: o => money(o.expectedSalary),
    best: 'min',
    subtext: () => '按年包口径',
  },
  { name: '期望城市', key: 'location' },

  { title: '能力画像', icon: 'i-lucide-badge-check' },
  { name: '技能数量', value: o => `${o.skillsCount} 项`, best: 'max' },
  { name: '最高学历', key: 'education' },
  { name: '最近公司', key: 'latestCompany' },
  { name: '到岗时间', key: 'noticePeriod' },

  { title: '项目经验', icon: 'i-lucide-folder-kanban' },
  { name: '项目数量', value: o => `${o.projectsCount} 个`, best: 'max' },
]
