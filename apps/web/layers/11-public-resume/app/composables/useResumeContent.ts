import type { ResumeContent } from '#layers/public-resume/app/types/resume'
import type { ResumeSaveState } from '#layers/public-resume/app/composables/useResumeDisplay'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import { resumeContentMockZh } from '#layers/public-resume/app/mock/resume-content.zh'

const STORAGE_KEY = 'my-resume.resume-content'

/** 与展示配置同一套防抖窗口：拖拽 / 连续输入合并成一次写入 */
const SAVE_DEBOUNCE = 600

function createDefaultContent(): ResumeContent {
  return structuredClone(resumeContentMockZh)
}

/**
 * 简历内容状态（可编辑）。
 *
 * 与 `useResumeDisplay` 分工：这里是**领域数据**，那边是「怎么呈现」。
 * 内容字段太多，逐个写 `setXxx` 动作不现实，所以表单**就地改字段** + `touch()` 标脏；
 * **落盘由 deep watch 自动完成**（与展示配置同一套策略，见 useResumeDisplay 的持久化段）。
 */
export function useResumeContent() {
  // 只有编辑态（管理员）才自动保存，访客浏览不写 localStorage
  const { editable } = useResumeDisplay()

  const content = useState<ResumeContent>('resume-content', createDefaultContent)
  const dirty = useState<boolean>('resume-content-dirty', () => false)
  const saveState = useState<ResumeSaveState>('resume-content-save-state', () => 'idle')
  const savedAt = useState<number | null>('resume-content-saved-at', () => null)
  const autoSaveBound = useState<boolean>('resume-content-autosave-bound', () => false)

  let timer: ReturnType<typeof setTimeout> | null = null

  /** 写盘。将来换成提交接口时只改这里 */
  function persist() {
    if (!import.meta.client) {
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content.value))
  }

  /** 立即落盘并复位脏标记 */
  function flushSave() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    persist()
    dirty.value = false
    saveState.value = 'saved'
    savedAt.value = Date.now()
  }

  function scheduleSave() {
    if (!import.meta.client || !editable.value) {
      return
    }
    dirty.value = true
    saveState.value = 'pending'
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(flushSave, SAVE_DEBOUNCE)
  }

  if (import.meta.client && !autoSaveBound.value) {
    autoSaveBound.value = true
    watch(content, scheduleSave, { deep: true })
  }

  /** 表单改动后标脏（真正的落盘由 watch 触发） */
  function touch() {
    dirty.value = true
  }

  /** 显式保存入口（关闭抽屉等场景可主动 flush） */
  function saveLocal() {
    flushSave()
  }

  function loadLocal() {
    if (!import.meta.client) {
      return
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      content.value = JSON.parse(raw) as ResumeContent
    }
    // 恢复数据本身不算"待保存的改动"
    dirty.value = false
    saveState.value = 'idle'
  }

  function reset() {
    content.value = createDefaultContent()
    dirty.value = false
  }

  return {
    content,
    dirty,
    saveState,
    savedAt,
    touch,
    saveLocal,
    flushSave,
    loadLocal,
    reset,
  }
}
