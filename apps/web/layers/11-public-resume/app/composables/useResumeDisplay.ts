import type {
  ResumeBackgroundType,
  ResumeColorMode,
  ResumeDisplayConfig,
  ResumeDropTarget,
  ResumeLayoutMode,
  ResumeSectionKey,
  ResumeSplitSide,
  ResumeStyleId,
  ResumeThemeColorKey,
  ResumeThemeConfig,
  ResumeThemePalette,
  ResumeThemePreset,
} from '#layers/public-resume/app/types/resume'
import {
  RESUME_CUSTOM_THEME,
  resumeDisplayMock,
  resumeThemePresets,
} from '#layers/public-resume/app/mock/resume-display'

const STORAGE_KEY = 'my-resume.display-config'

/** 自动保存的防抖窗口（拖拽 / 连续点选时合并成一次写入） */
const SAVE_DEBOUNCE = 600

/** 保存状态：给头部显示用 */
export type ResumeSaveState = 'idle' | 'pending' | 'saved'

/** 深拷贝一份默认配置：避免多个请求 / 多次挂载共享同一个对象 */
function createDefaultConfig(): ResumeDisplayConfig {
  return structuredClone(resumeDisplayMock)
}

/** 调色盘的字段顺序（迁移旧结构时按它取平铺在顶层的旧值） */
const THEME_COLOR_KEYS: ResumeThemeColorKey[] = [
  'primary',
  'gradientFrom',
  'gradientTo',
  'surface',
  'text',
  'muted',
  'border',
  'chipBg',
  'chipText',
]

function isPalette(value: unknown): value is ResumeThemePalette {
  if (!value || typeof value !== 'object') {
    return false
  }
  const source = value as Record<string, unknown>

  return THEME_COLOR_KEYS.every((key) => typeof source[key] === 'string')
}

/** 旧结构里颜色平铺在 theme 顶层，这里按字段取出来并补全缺项 */
function paletteFromFlat(
  source: Record<string, unknown>,
  fallback: ResumeThemePalette,
): ResumeThemePalette {
  const palette = { ...fallback }
  for (const key of THEME_COLOR_KEYS) {
    const value = source[key]
    if (typeof value === 'string' && value) {
      palette[key] = value
    }
  }

  return palette
}

/**
 * 旧版本地配置的主题迁移。
 *
 * 主题模型改过三轮：① 颜色由 `dark` 派生 → ② 9 个颜色平铺在 theme 顶层 →
 * ③ 现在「一套配色 = light + dark 两组」+ 独立 `mode`。
 *
 * 因此读到的旧配置可能缺分组、或 id 已不存在（如删掉的 `business`）。
 * 策略：认得出 id 就用该预设补底；认不出回退首个预设；
 * 旧结构里平铺的那批色值落到 `mode` 指向的那一组，尽量保住用户当时的观感。
 */
function normalizeTheme(theme: unknown): ResumeThemeConfig {
  const source = (theme && typeof theme === 'object' ? theme : {}) as Record<string, unknown>
  const preset = resumeThemePresets.find((item) => item.id === source.id)
  const base = preset ?? resumeThemePresets[0]!

  const id = typeof source.id === 'string' && source.id ? source.id : base.id
  const label = typeof source.label === 'string' && source.label ? source.label : base.label
  const mode: ResumeColorMode
    = source.mode === 'dark' || (source.mode === undefined && source.dark === true) ? 'dark' : 'light'
  const hasFlat = THEME_COLOR_KEYS.some((key) => typeof source[key] === 'string')

  const light = isPalette(source.light)
    ? { ...base.light, ...source.light }
    : hasFlat && mode === 'light'
      ? paletteFromFlat(source, base.light)
      : base.light
  const dark = isPalette(source.dark)
    ? { ...base.dark, ...source.dark }
    : hasFlat && mode === 'dark'
      ? paletteFromFlat(source, base.dark)
      : base.dark

  return { id, label, mode, light, dark }
}

/**
 * 展示配置的唯一状态入口。
 *
 * 约定：
 * - 用 `useState` 而不是 module 级 `reactive`（后者在 SSR 下会跨请求串状态）；
 * - 页面与设置面板**只调用动作**，不直接改配置对象 —— 将来换成后端提交时只需改这里；
 * - 拖拽排序 / 显隐 / 主题 / 背景 / 风格都走同一份 config，切布局不丢编排；
 * - **变更自动落盘**：`watch(config, deep)` → 防抖 → `persist()`。
 *   只有编辑态（管理员）才写，访客浏览不会污染 localStorage。
 */
export function useResumeDisplay() {
  const config = useState<ResumeDisplayConfig>('resume-display-config', createDefaultConfig)
  const settingsOpen = useState<boolean>('resume-display-settings-open', () => false)
  /** 编辑模式：由管理员登录态决定（见 useResumeAdmin / pages/resume/index.vue） */
  const editable = useState<boolean>('resume-display-editable', () => false)
  const saveState = useState<ResumeSaveState>('resume-display-save-state', () => 'idle')
  const savedAt = useState<number | null>('resume-display-saved-at', () => null)
  /** 自动保存只绑定一次：本 composable 会被多个组件调用，避免注册多个 watcher */
  const autoSaveBound = useState<boolean>('resume-display-autosave-bound', () => false)

  const isDirty = computed(
    () => JSON.stringify(config.value) !== JSON.stringify(resumeDisplayMock),
  )

  let timer: ReturnType<typeof setTimeout> | null = null

  // ── 持久化（唯一入口）────────────────────────────────
  /**
   * 写盘。**将来换成 `PUT /resume/display-config` 只改这一个函数**，
   * 自动保存、手动保存、退出前兜底都复用它。
   */
  function persist() {
    if (!import.meta.client) {
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))
  }

  /** 立即落盘并更新保存状态（退出编辑态前会兜底调用一次） */
  function flushSave() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    persist()
    saveState.value = 'saved'
    savedAt.value = Date.now()
  }

  function scheduleSave() {
    // 非编辑态不写：访客浏览、初始加载、以及 loadLocal 触发的变更都不该落盘
    if (!import.meta.client || !editable.value) {
      return
    }
    saveState.value = 'pending'
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(flushSave, SAVE_DEBOUNCE)
  }

  if (import.meta.client && !autoSaveBound.value) {
    autoSaveBound.value = true
    watch(config, scheduleSave, { deep: true })
  }

  // ── 布局 ──────────────────────────────────────────────
  function setLayoutMode(mode: ResumeLayoutMode) {
    config.value.layout.mode = mode
  }
  function setSplitSide(side: ResumeSplitSide) {
    config.value.layout.splitSide = side
  }
  function toggleStickySide() {
    config.value.layout.stickySide = !config.value.layout.stickySide
  }
  function setSideWidth(width: ResumeDisplayConfig['layout']['sideWidth']) {
    config.value.layout.sideWidth = width
  }

  // ── 品牌 ──────────────────────────────────────────────
  /** 只覆盖传入的字段；留空字段仍走预设 */
  function setBrand(patch: Partial<ResumeDisplayConfig['brand']>) {
    config.value.brand = { ...config.value.brand, ...patch }
  }

  // ── 主题 / 背景 ───────────────────────────────────────
  /** 切预设：保留当前明暗 —— 「绿色 + 深色」本身是合理组合 */
  function applyTheme(preset: ResumeThemePreset) {
    config.value.theme = { ...structuredClone(preset), mode: config.value.theme.mode }
  }

  /**
   * 切到「自定义」：把当前配色复制一份再换 id。
   *
   * 这样从任意预设出发都能接着微调，而不是从空白开始；
   * 切回预设时自定义的那份值不再保留（用户预期是"看预设长什么样"）。
   */
  function applyCustomTheme() {
    config.value.theme = { ...config.value.theme, ...RESUME_CUSTOM_THEME }
  }

  /** 切换明暗（与配色预设正交） */
  function setMode(mode: ResumeColorMode) {
    config.value.theme = { ...config.value.theme, mode }
  }

  /**
   * 改**某一明暗组**里的单个颜色（面板仅在自定义主题下开放编辑）。
   *
   * 调色盘把 light / dark 两组平铺展示，所以要显式传组：改的是被点的那一组。
   */
  function setThemeField(mode: ResumeColorMode, key: ResumeThemeColorKey, value: string) {
    config.value.theme = {
      ...config.value.theme,
      [mode]: { ...config.value.theme[mode], [key]: value },
    }
  }
  function setBackgroundType(type: ResumeBackgroundType) {
    config.value.background.type = type
  }
  function setTexture(textureId: string) {
    config.value.background.textureId = textureId
    config.value.background.type = textureId === 'none' ? 'plain' : 'texture'
  }
  function setBackgroundImage(patch: Partial<ResumeDisplayConfig['background']['image']>) {
    config.value.background.image = { ...config.value.background.image, ...patch }
  }

  // ── 风格 ──────────────────────────────────────────────
  /**
   * 风格只改「区块长什么样」。
   *
   * 与 `theme`（颜色）、`sections`（编排）互不影响：
   * 切风格不会动 order / slot / hidden，也不会改主题色。
   */
  function setStyle(id: ResumeStyleId) {
    config.value.style.id = id
  }

  // ── 区块编排 ──────────────────────────────────────────
  /** 显隐开关（设置面板用） */
  function toggleSection(key: ResumeSectionKey) {
    const index = config.value.sections.hidden.indexOf(key)
    if (index >= 0) {
      config.value.sections.hidden.splice(index, 1)
    }
    else {
      config.value.sections.hidden.push(key)
    }
  }

  /** 显式设置显隐（托盘拖拽用） */
  function setHidden(key: ResumeSectionKey, hidden: boolean) {
    const list = config.value.sections.hidden
    const index = list.indexOf(key)
    if (hidden && index < 0) {
      config.value.sections.hidden = [...list, key]
    }
    else if (!hidden && index >= 0) {
      config.value.sections.hidden = list.filter((item) => item !== key)
    }
  }

  /**
   * 拖拽落地的唯一入口：栏位之间、进出托盘都是同一套「锚点」语义。
   *
   * - 落到**托盘** → 加入 `hidden`，**不改 order**（拖回来时还在原位置附近）
   * - 落到**栏位** → 取消隐藏 + 写 `slot`，并把 key 插到 `anchorKey` 之前（无锚点 = 末尾）
   *
   * `anchorKey` 由调用方用**渲染数据**算出（不读 DOM）：拖拽期间数据不变，
   * 所以「目标栏去掉自身后的数组」的 `newIndex` 项就是落点之后的那一项。
   */
  function applyDrop(input: {
    key: ResumeSectionKey
    to: ResumeDropTarget
    /** 落在它之前的那一项；为空表示落在该容器末尾 */
    anchorKey?: ResumeSectionKey
  }) {
    const { key, to, anchorKey } = input

    if (to === 'tray') {
      setHidden(key, true)
      return
    }

    setHidden(key, false)
    config.value.sections.slot = { ...config.value.sections.slot, [key]: to }

    const order = config.value.sections.order.filter((item) => item !== key)
    const anchorIndex = anchorKey ? order.indexOf(anchorKey) : -1
    order.splice(anchorIndex >= 0 ? anchorIndex : order.length, 0, key)
    config.value.sections.order = order
  }

  /**
   * 栏内相邻交换：把 `key` 与它在**同一栏**里的上/下一个模块换位。
   *
   * 分栏是「order + slot」派生出来的，所以由调用方传入该栏当前的渲染顺序，
   * store 不重复实现分栏逻辑；只交换这两项在全局 order 中的位置，其余项不动。
   */
  function moveWithin(slotKeys: ResumeSectionKey[], key: ResumeSectionKey, delta: number) {
    const index = slotKeys.indexOf(key)
    const targetIndex = index + delta
    const targetKey = slotKeys[targetIndex]

    if (index < 0 || !targetKey) {
      return
    }

    const order = [...config.value.sections.order]
    const a = order.indexOf(key)
    const b = order.indexOf(targetKey)
    if (a < 0 || b < 0) {
      return
    }

    order[a] = targetKey
    order[b] = key
    config.value.sections.order = order
  }

  // ── 面板与持久化 ──────────────────────────────────────
  function toggleSettings() {
    settingsOpen.value = !settingsOpen.value
  }
  function setEditable(value: boolean) {
    // 退出编辑态时把待写的改动兜底落盘，避免"刚拖完就退出"丢数据
    if (!value && editable.value) {
      flushSave()
    }
    editable.value = value
  }
  function reset() {
    config.value = createDefaultConfig()
    // 重置也是一次变更，编辑态下由 watch 自动保存
  }
  function loadLocal() {
    if (!import.meta.client) {
      return
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ResumeDisplayConfig
      // 旧配置可能缺主题字段，补全后再使用（见 normalizeTheme）
      parsed.theme = normalizeTheme(parsed.theme)
      config.value = parsed
    }
    // 恢复数据本身不算"待保存的改动"
    saveState.value = 'idle'
  }

  return {
    // 状态
    config,
    settingsOpen,
    editable,
    isDirty,
    saveState,
    savedAt,
    // 布局
    setLayoutMode,
    setSplitSide,
    toggleStickySide,
    setSideWidth,
    // 品牌 / 主题 / 背景
    setBrand,
    applyTheme,
    setMode,
    applyCustomTheme,
    setThemeField,
    setBackgroundType,
    setTexture,
    setBackgroundImage,
    // 风格
    setStyle,
    // 编排
    toggleSection,
    setHidden,
    applyDrop,
    moveWithin,
    // 面板 / 持久化
    toggleSettings,
    setEditable,
    reset,
    persist,
    flushSave,
    loadLocal,
  }
}
