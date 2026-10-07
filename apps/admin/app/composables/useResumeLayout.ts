import { useLocalStorage } from '@vueuse/core'

/**
 * 简历布局配置（参考 greensketch 的 useProposalPageLayout，解耦成简历域）。
 *
 * 思路：把「一页简历有哪些 section、顺序如何、各自显隐、主题色/预设主题」都变成数据，
 * 编辑态实时驱动预览，点 Save 才持久化（localStorage 模拟后端）。
 *
 * - `sections`：模块定义（含嵌套 children、locked、actionKey）
 * - `order`：模块顺序（string[]，模块 id）
 * - `switches`：模块/子模块/固定开关的显隐（0/1）
 * - `themeId + themeColor + gradientFrom + gradientTo`：主题（预设 + 颜色微调）
 * - `isDirty`：与上次保存快照对比，决定 Save/Reset 按钮是否出现
 */

export interface ResumeSectionChild {
  id: string
  label: string
  /** 对应 switches 里的 key；没有则不可显隐切换 */
  switchKey?: string
  /** 有则渲染一个「配置」图标，点击后由页面处理（如打开编辑弹窗） */
  actionKey?: string
  children?: ResumeSectionChild[]
}

export interface ResumeSection {
  id: string
  label: string
  /** 锁定后不能拖拽排序、也不能被其它模块挤到前面 */
  locked?: boolean
  switchKey?: string
  actionKey?: string
  children?: ResumeSectionChild[]
}

export interface ResumeSwitchOption {
  label: string
  switchKey: string
  /** true 时，勾选 = 隐藏（switch OFF），语义反转 */
  inverted?: boolean
  hint?: string
}

/** 预设主题（对标 greensketch 的 standard / vivid_verde / silicon_horizon 模板） */
export interface ResumeThemePreset {
  id: string
  label: string
  description?: string
  /** 主题色（主色） */
  themeColor: string
  /** 渐变起始色 */
  gradientFrom: string
  /** 渐变结束色 */
  gradientTo: string
  /** 预览区背景（Tailwind 类） */
  bgClass: string
  /** 是否深色（影响文字/卡片颜色） */
  dark?: boolean
}

export const RESUME_THEME_PRESETS: ResumeThemePreset[] = [
  {
    id: 'light',
    label: '简约白',
    description: '中性灰底，蓝色主色',
    themeColor: '#1578d0',
    gradientFrom: '#1578d0',
    gradientTo: '#3ec064',
    bgClass: 'bg-neutral-100',
  },
  {
    id: 'vivid',
    label: '绿色清新',
    description: '浅绿底，绿色主色',
    themeColor: '#3ec064',
    gradientFrom: '#6eec66',
    gradientTo: '#429cf0',
    bgClass: 'bg-emerald-50',
  },
  {
    id: 'blue',
    label: '蓝色商务',
    description: '天蓝底，蓝紫渐变',
    themeColor: '#0ea5e9',
    gradientFrom: '#0ea5e9',
    gradientTo: '#6366f1',
    bgClass: 'bg-sky-50',
  },
  {
    id: 'dark',
    label: '深色科技',
    description: '深灰底，紫粉渐变',
    themeColor: '#8b5cf6',
    gradientFrom: '#6366f1',
    gradientTo: '#ec4899',
    bgClass: 'bg-neutral-900',
    dark: true,
  },
]

/** 默认模块定义 —— 简历的 section 结构（可自由增删，驱动侧栏与预览） */
export const RESUME_SECTIONS: ResumeSection[] = [
  {
    id: 'header',
    label: '基本信息',
    locked: true,
    switchKey: 'headerSwitch',
    children: [
      { id: 'contact', label: '联系方式', switchKey: 'contactSwitch', actionKey: 'contact' },
    ],
  },
  { id: 'summary', label: '个人概览', switchKey: 'summarySwitch', actionKey: 'summary' },
  { id: 'experience', label: '工作经历', switchKey: 'experienceSwitch' },
  { id: 'projects', label: '项目经历', switchKey: 'projectsSwitch', actionKey: 'projects' },
  { id: 'education', label: '教育背景', switchKey: 'educationSwitch' },
  { id: 'skills', label: '专业技能', switchKey: 'skillsSwitch' },
  { id: 'certificates', label: '证书', switchKey: 'certificatesSwitch' },
  { id: 'languages', label: '语言能力', switchKey: 'languagesSwitch' },
  { id: 'hobbies', label: '兴趣爱好', switchKey: 'hobbiesSwitch' },
]

/** 「敏感数据」面板的开关项 */
export const RESUME_INFO_OPTIONS: ResumeSwitchOption[] = [
  { label: '显示手机号', switchKey: 'showPhoneSwitch' },
  { label: '显示邮箱', switchKey: 'showEmailSwitch' },
  { label: '显示年龄', switchKey: 'showAgeSwitch', inverted: true, hint: '勾选 = 隐藏年龄' },
]

/** 「导出」面板的开关项 */
export const RESUME_EXPORT_OPTIONS: ResumeSwitchOption[] = [
  { label: 'PDF 显示页码', switchKey: 'pdfPageNumbersSwitch' },
  { label: '导出时隐藏薪资', switchKey: 'hideSalarySwitch' },
]

const STORAGE_KEY = 'resume-layout:value'

interface ResumeLayoutState {
  themeId: string
  order: string[]
  switches: Record<string, number>
  themeColor: string
  gradientFrom: string
  gradientTo: string
}

function createDefaultState(): ResumeLayoutState {
  const switches: Record<string, number> = {}
  const collect = (node: ResumeSection | ResumeSectionChild) => {
    if (node.switchKey) switches[node.switchKey] = 1
    node.children?.forEach(collect)
  }
  RESUME_SECTIONS.forEach(collect)
  ;[...RESUME_INFO_OPTIONS, ...RESUME_EXPORT_OPTIONS].forEach(o => switches[o.switchKey] = 1)

  const preset = RESUME_THEME_PRESETS[0]!
  return {
    themeId: preset.id,
    order: RESUME_SECTIONS.map(s => s.id),
    switches,
    themeColor: preset.themeColor,
    gradientFrom: preset.gradientFrom,
    gradientTo: preset.gradientTo,
  }
}

/** 归一化开关值：0/false → 0，1/true → 1，其它 → 默认 1 */
function normalizeSwitch(value: unknown, defaultValue = 1): number {
  return value === 0 || value === '0' || value === false
    ? 0
    : value === 1 || value === '1' || value === true
      ? 1
      : defaultValue
}

export function useResumeLayout() {
  const storage = useLocalStorage<ResumeLayoutState>(STORAGE_KEY, createDefaultState(), {
    mergeDefaults: (stored, defaults) => ({ ...defaults, ...stored }),
  })

  const sections = RESUME_SECTIONS
  const themeId = ref<string>(storage.value.themeId)
  const order = ref<string[]>(storage.value.order)
  const switches = ref<Record<string, number>>(storage.value.switches)
  const themeColor = ref(storage.value.themeColor)
  const gradientFrom = ref(storage.value.gradientFrom)
  const gradientTo = ref(storage.value.gradientTo)

  // 上次保存快照，用于 isDirty 对比
  const lastSaved = ref<ResumeLayoutState>(JSON.parse(JSON.stringify(storage.value)))

  const themePreset = computed(() =>
    RESUME_THEME_PRESETS.find(t => t.id === themeId.value) ?? RESUME_THEME_PRESETS[0]!,
  )

  /** 应用预设主题：覆盖 themeId + 三色，后续可继续微调颜色 */
  function applyTheme(id: string) {
    const preset = RESUME_THEME_PRESETS.find(t => t.id === id)
    if (!preset) return
    themeId.value = preset.id
    themeColor.value = preset.themeColor
    gradientFrom.value = preset.gradientFrom
    gradientTo.value = preset.gradientTo
  }

  function snapshot() {
    lastSaved.value = {
      themeId: themeId.value,
      order: [...order.value],
      switches: { ...switches.value },
      themeColor: themeColor.value,
      gradientFrom: gradientFrom.value,
      gradientTo: gradientTo.value,
    }
  }

  const isDirty = computed(() => {
    const orderChanged = JSON.stringify(order.value) !== JSON.stringify(lastSaved.value.order)
    const switchChanged = Object.keys(switches.value).some(key =>
      normalizeSwitch(switches.value[key]) !== normalizeSwitch(lastSaved.value.switches[key]),
    )
    const themeChanged = themeId.value !== lastSaved.value.themeId
      || themeColor.value !== lastSaved.value.themeColor
      || gradientFrom.value !== lastSaved.value.gradientFrom
      || gradientTo.value !== lastSaved.value.gradientTo
    return orderChanged || switchChanged || themeChanged
  })

  function getSwitch(key?: string): number {
    if (!key) return 1
    return normalizeSwitch(switches.value[key])
  }

  function setSwitch(key: string, value: number) {
    switches.value[key] = normalizeSwitch(value)
  }

  function toggleSwitch(key?: string) {
    if (!key) return
    switches.value[key] = getSwitch(key) ? 0 : 1
  }

  function setOrder(list: string[]) {
    order.value = [...list]
  }

  /** 保存：写入 localStorage + 更新快照 */
  function saveLayout() {
    storage.value = {
      themeId: themeId.value,
      order: [...order.value],
      switches: { ...switches.value },
      themeColor: themeColor.value,
      gradientFrom: gradientFrom.value,
      gradientTo: gradientTo.value,
    }
    snapshot()
  }

  /** 重置：回到上次保存的快照 */
  function resetLayout() {
    themeId.value = lastSaved.value.themeId
    order.value = [...lastSaved.value.order]
    switches.value = { ...lastSaved.value.switches }
    themeColor.value = lastSaved.value.themeColor
    gradientFrom.value = lastSaved.value.gradientFrom
    gradientTo.value = lastSaved.value.gradientTo
  }

  /** 按模块 id 取定义 */
  const sectionMap = computed<Record<string, ResumeSection>>(() =>
    sections.reduce((acc, s) => {
      acc[s.id] = s
      return acc
    }, {} as Record<string, ResumeSection>),
  )

  /** 生效配置：扁平开关 + 主题，供预览渲染消费 */
  const effectiveSettings = computed(() => ({
    themeId: themeId.value,
    themeColor: themeColor.value,
    gradientFrom: gradientFrom.value,
    gradientTo: gradientTo.value,
    ...switches.value,
  }))

  return {
    sections,
    sectionMap,
    themeId,
    themePresets: RESUME_THEME_PRESETS,
    themePreset,
    order,
    switches,
    themeColor,
    gradientFrom,
    gradientTo,
    effectiveSettings,
    infoOptions: RESUME_INFO_OPTIONS,
    exportOptions: RESUME_EXPORT_OPTIONS,
    isDirty,
    getSwitch,
    setSwitch,
    toggleSwitch,
    setOrder,
    applyTheme,
    saveLayout,
    resetLayout,
  }
}
