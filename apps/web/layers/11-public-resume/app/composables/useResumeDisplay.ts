import type {
  ResumeBackgroundType,
  ResumeDisplayConfig,
  ResumeLayoutMode,
  ResumeSectionKey,
  ResumeSlotKey,
  ResumeSplitSide,
  ResumeThemeConfig,
} from '../types/resume'
import { resumeDisplayMock } from '../mock/resume-display'

const STORAGE_KEY = 'my-resume.display-config'

/** 深拷贝一份默认配置：避免多个请求 / 多次挂载共享同一个对象 */
function createDefaultConfig(): ResumeDisplayConfig {
  return structuredClone(resumeDisplayMock)
}

/**
 * 展示配置的唯一状态入口。
 *
 * 约定：
 * - 用 `useState` 而不是 module 级 `reactive`（后者在 SSR 下会跨请求串状态）；
 * - 页面与设置面板**只调用动作**，不直接改配置对象 —— 将来换成后端提交时只需改这里；
 * - 拖拽排序 / 显隐 / 主题 / 背景都走同一份 config，切布局不丢编排。
 */
export function useResumeDisplay() {
  const config = useState<ResumeDisplayConfig>('resume-display-config', createDefaultConfig)
  const settingsOpen = useState<boolean>('resume-display-settings-open', () => false)
  /** 编辑模式：B 期由登录态（管理员）决定；本轮只提供开关与契约，不做拖拽实现 */
  const editable = useState<boolean>('resume-display-editable', () => false)

  const isDirty = computed(
    () => JSON.stringify(config.value) !== JSON.stringify(resumeDisplayMock),
  )

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

  // ── 主题 / 背景 ───────────────────────────────────────
  function applyTheme(preset: ResumeThemeConfig) {
    config.value.theme = { ...preset }
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

  // ── 区块编排 ──────────────────────────────────────────
  function toggleSection(key: ResumeSectionKey) {
    const index = config.value.sections.hidden.indexOf(key)
    if (index >= 0) {
      config.value.sections.hidden.splice(index, 1)
    }
    else {
      config.value.sections.hidden.push(key)
    }
  }
  /** 拖拽排序的落点（B 期接拖拽组件时调用） */
  function moveSection(from: number, to: number) {
    const order = config.value.sections.order
    const [moved] = order.splice(from, 1)
    if (moved) {
      order.splice(to, 0, moved)
    }
  }
  /** 跨栏拖拽：覆盖注册表里的默认归属 */
  function assignSlot(key: ResumeSectionKey, slot: ResumeSlotKey) {
    config.value.sections.slot = { ...config.value.sections.slot, [key]: slot }
  }

  // ── 面板与持久化 ──────────────────────────────────────
  function toggleSettings() {
    settingsOpen.value = !settingsOpen.value
  }
  function setEditable(value: boolean) {
    editable.value = value
  }
  function reset() {
    config.value = createDefaultConfig()
  }
  /** 本地保存（先用 localStorage 顶替后端；C 期换成提交接口） */
  function saveLocal() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))
    }
  }
  function loadLocal() {
    if (!import.meta.client) {
      return
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      config.value = JSON.parse(raw) as ResumeDisplayConfig
    }
  }

  return {
    // 状态
    config,
    settingsOpen,
    editable,
    isDirty,
    // 布局
    setLayoutMode,
    setSplitSide,
    toggleStickySide,
    setSideWidth,
    // 主题 / 背景
    applyTheme,
    setBackgroundType,
    setTexture,
    setBackgroundImage,
    // 编排
    toggleSection,
    moveSection,
    assignSlot,
    // 面板 / 持久化
    toggleSettings,
    setEditable,
    reset,
    saveLocal,
    loadLocal,
  }
}
