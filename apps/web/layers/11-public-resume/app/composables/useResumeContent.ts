import type { ResumeContent } from '#layers/public-resume/app/types/resume'
import { resumeContentMockZh } from '#layers/public-resume/app/mock/resume-content.zh'

const STORAGE_KEY = 'my-resume.resume-content'

function createDefaultContent(): ResumeContent {
  return structuredClone(resumeContentMockZh)
}

/**
 * 简历内容状态（可编辑）。
 *
 * 与 `useResumeDisplay` 分工：这里是**领域数据**，那边是「怎么呈现」。
 * 内容字段太多，逐个写 `setXxx` 动作不现实，所以表单**就地改字段**，改完调用 `touch()` 标脏；
 * 展示配置仍然只通过动作修改（它改的是结构，值得被约束）。
 */
export function useResumeContent() {
  const content = useState<ResumeContent>('resume-content', createDefaultContent)
  const dirty = useState<boolean>('resume-content-dirty', () => false)

  function touch() {
    dirty.value = true
  }

  /** 本地保存（C 期换成提交接口） */
  function saveLocal() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content.value))
    }
    dirty.value = false
  }

  function loadLocal() {
    if (!import.meta.client) {
      return
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      content.value = JSON.parse(raw) as ResumeContent
    }
  }

  function reset() {
    content.value = createDefaultContent()
    dirty.value = false
  }

  return { content, dirty, touch, saveLocal, loadLocal, reset }
}
