import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useMutation } from '@pinia/colada'
import { onBeforeRouteLeave } from 'vue-router'
import { normalizeApiError, resumeDocumentSchema, type ResumeDocument, type ResumeDraftResponse } from '@rs/common'
import { createResumeDraftApi } from '#layers/public-resume/app/apis/resume-draft'

export function useResumeDraft() {
  const api = createResumeDraftApi()
  const { user, isAuthed, isAdmin, session } = useAuthState()
  const { canEditSections } = usePermission()
  const canEdit = computed(() => isAuthed.value && isAdmin.value && canEditSections.value)
  const draft = ref<ResumeDraftResponse | null>(null)
  const document = ref<ResumeDocument | null>(null)
  const status = ref<'idle' | 'loading' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const error = ref('')
  const reauthRequired = ref(false)
  /**
   * 本地记录的草稿已失效时的提示（与 `error` 分开）。
   *
   * 场景：`resumes.id` 从 cuid 改为 integer 之后，浏览器 localStorage 里可能还存着旧 id，
   * 或该简历已被删除 —— 这时自动恢复会 404。这里**不当作错误**，而是清掉本地记录并提示
   * 用户可以重新创建，避免用户卡在一个无法自救的报错上。
   */
  const staleNotice = ref('')
  const dirty = computed(
    () => document.value !== null && JSON.stringify(document.value) !== JSON.stringify(draft.value?.document),
  )
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let saving = false
  const { mutateAsync: saveRequest } = useMutation({
    mutation: (input: { id: string; expectedRevision: number; document: ResumeDocument }) =>
      api.save(input.id, { expectedRevision: input.expectedRevision, document: input.document }),
  })

  function cancelTimer() {
    if (timer) clearTimeout(timer)
    timer = undefined
  }

  /** localStorage 的键名按用户区分；未登录（无 userId）时不记录。 */
  function storedIdKey(): string | null {
    return user.value?.id ? `my-resume.draft-id.${user.value.id}` : null
  }
  function writeStoredId(id: string) {
    if (!import.meta.client) return
    const key = storedIdKey()
    if (key) localStorage.setItem(key, id)
  }
  function clearStoredId() {
    if (!import.meta.client) return
    const key = storedIdKey()
    if (key) localStorage.removeItem(key)
  }
  function adopt(response: ResumeDraftResponse) {
    resumeDocumentSchema.parse(response.document)
    draft.value = response
    document.value = structuredClone(response.document)
    status.value = 'saved'
    error.value = ''
    // resume.id 现为 integer 自增主键；localStorage 只能存字符串，URL 参数也是字符串，故此处转一下
    writeStoredId(String(response.resume.id))
  }
  function fail(problem: unknown) {
    const normalized = normalizeApiError(problem)
    reauthRequired.value = normalized.code === 401
    status.value = normalized.errorCode === 'Resume.Draft:conflict' ? 'conflict' : 'error'
    error.value = normalized.message || '请求失败，请稍后重试'
  }
  /**
   * 读取草稿。
   *
   * `origin` 区分调用来源：
   * - `stored`：从 localStorage 自动恢复。这类 id 可能来自旧版本（主键已从 cuid 改为 integer）
   *   或已被删除，404 属**预期内**，清理本地记录并提示，不报错；
   * - `manual`：用户在输入框里手敲的 id。404 是真实反馈，照常报错。
   */
  async function load(id: string, origin: 'stored' | 'manual' = 'manual') {
    cancelTimer()
    const expected = ++generation
    status.value = 'loading'
    error.value = ''
    staleNotice.value = ''
    try {
      const result = await api.read(id)
      if (expected === generation) adopt(result)
    } catch (problem) {
      if (expected !== generation) return
      // ⚠️ 这里要同时认 400 与 404：旧 id 是 cuid 形态，会被路由参数的数字校验挡下（400），
      //    而已删除的整数 id 则是 404。401（会话失效）与 5xx（服务端问题）不能吞，照常报错。
      const code = normalizeApiError(problem).code
      if (origin === 'stored' && (code === 400 || code === 404)) {
        clearStoredId()
        status.value = 'idle'
        error.value = ''
        staleNotice.value = '本地记录的草稿已不存在（可能因主键调整或已被删除），已清除本地记录，可直接创建新草稿。'
        return
      }
      fail(problem)
    }
  }
  async function create(name: string, initial: ResumeDocument) {
    if (!canEdit.value || saving || dirty.value || status.value === 'loading') return
    const expected = ++generation
    status.value = 'loading'
    error.value = ''
    try {
      const result = await api.create({ name, locale: 'zh', document: resumeDocumentSchema.parse(initial) })
      if (expected === generation) adopt(result)
    } catch (problem) {
      if (expected === generation) fail(problem)
    }
  }
  async function save() {
    cancelTimer()
    if (
      !canEdit.value ||
      reauthRequired.value ||
      !draft.value ||
      !document.value ||
      !dirty.value ||
      saving ||
      status.value === 'conflict' ||
      status.value === 'loading'
    )
      return
    const parsed = resumeDocumentSchema.safeParse(document.value)
    if (!parsed.success) {
      status.value = 'error'
      error.value = parsed.error.issues[0]?.message ?? '字段不合法'
      return
    }
    const expected = generation
    const submittedInput = JSON.stringify(document.value)
    const requestDocument = structuredClone(parsed.data)
    saving = true
    status.value = 'saving'
    try {
      const response = await saveRequest({
        id: String(draft.value.resume.id),
        expectedRevision: draft.value.revision,
        document: requestDocument,
      })
      if (expected !== generation) return
      draft.value = response
      if (JSON.stringify(document.value) === submittedInput) document.value = structuredClone(response.document)
      status.value = dirty.value ? 'pending' : 'saved'
      error.value = ''
    } catch (problem) {
      if (expected === generation) fail(problem)
    } finally {
      saving = false
      if (status.value === 'pending') schedule()
    }
  }
  function schedule() {
    cancelTimer()
    if (!dirty.value && status.value === 'pending') status.value = 'saved'
    if (
      !canEdit.value ||
      reauthRequired.value ||
      !dirty.value ||
      saving ||
      status.value === 'conflict' ||
      status.value === 'error' ||
      status.value === 'loading'
    )
      return
    status.value = 'pending'
    timer = setTimeout(() => void save(), 2500)
  }
  function backup() {
    if (!document.value || !import.meta.client) return
    const href = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { resumeId: draft.value?.resume.id, revision: draft.value?.revision, document: document.value },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    )
    const anchor = window.document.createElement('a')
    anchor.href = href
    anchor.download = 'resume-draft-backup.json'
    anchor.click()
    URL.revokeObjectURL(href)
  }
  function beforeUnload(event: BeforeUnloadEvent) {
    if (dirty.value) {
      event.preventDefault()
      event.returnValue = ''
    }
  }
  watch(document, schedule, { deep: true, flush: 'post' })
  function restoreSelected() {
    const key = storedIdKey()
    const id = isAuthed.value && key ? localStorage.getItem(key) : null
    if (id) void load(id, 'stored')
  }
  watch(
    () => user.value?.id,
    () => {
      cancelTimer()
      generation++
      draft.value = null
      document.value = null
      error.value = ''
      staleNotice.value = ''
      status.value = 'idle'
      reauthRequired.value = false
      if (import.meta.client) restoreSelected()
    },
  )
  watch(canEdit, value => {
    if (!value) cancelTimer()
  })
  watch(session, value => {
    if (value) reauthRequired.value = false
  })
  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnload)
    restoreSelected()
  })
  onBeforeUnmount(() => {
    cancelTimer()
    generation++
    window.removeEventListener('beforeunload', beforeUnload)
  })
  onBeforeRouteLeave(() => !dirty.value || window.confirm('仍有未保存的改动，是否离开？建议先保存或导出备份。'))
  return { draft, document, status, error, staleNotice, dirty, canEdit, reauthRequired, create, load, save, backup }
}
