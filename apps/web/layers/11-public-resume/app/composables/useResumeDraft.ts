import { computed, ref, toValue, watch, onBeforeUnmount, type MaybeRefOrGetter } from 'vue'
import { useMutation } from '@pinia/colada'
import { onBeforeRouteLeave } from 'vue-router'
import { normalizeApiError, resumeDocumentSchema, type ResumeDocument, type ResumeDraftResponse } from '@rs/common'
import { createResumeDraftApi } from '#layers/public-resume/app/apis/resume-draft'

/**
 * 草稿工作台的状态。
 *
 * `initialId`：URL 里指定的简历 id（`/my-resumes/draft/:id`）。
 * - 有值时**以它为准**（用户明确选了这一份），按 `manual` 处理 —— 找不到就如实报错；
 * - 没值时回退到 localStorage 记的"上次编辑的那份"（`stored`，404 宽容处理）。
 */
export function useResumeDraft(initialId?: MaybeRefOrGetter<string | null>) {
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
  /**
   * 统一的失败落点：**必须同时**写 `status` 与 `error`。
   *
   * ⚠️ 这两个字段由 `labels[status]` 直接驱动界面文案，一旦不同步就会退化成"黑盒"：
   * 用户只看到"保存或读取失败"却不知道为什么。API 错误由 `normalizeApiError` 给出人话；
   * 非 API 异常（例如历史那次 `DataCloneError`）没有 `message` 语义，给一句兜底。
   */
  function fail(problem: unknown, fallback = '保存失败，请重试或先导出备份') {
    const normalized = normalizeApiError(problem)
    reauthRequired.value = normalized.code === 401
    status.value = normalized.errorCode === 'Resume.Draft:conflict' ? 'conflict' : 'error'
    error.value = normalized.message || fallback
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
      // ⚠️ `error` **刻意不在守卫里**：否则「保存失败 → 修好内容 → 再保存」会被永久挡住，
      //    用户只能刷新页面才能重试（这正是"黑盒"的来源之一）。
      status.value === 'conflict' ||
      status.value === 'loading'
    )
      return
    const expected = generation
    // ⚠️ 守卫里已排除 `error`，所以这里要 accept 它；成功时再清掉。
    //    否则「失败 → 修复 → 重试」永远被上面的守卫挡住。
    const isRetry = status.value === 'error'
    /**
     * ⚠️ 保存链路的核心约束：**不能把 reactive 代理喂给 Zod**。
     *
     * 实测（2026-10-15）两个坑，都会让保存彻底失效：
     *  1. 直接传 `document.value`：Zod 解析时内部克隆 → 抛
     *     `DataCloneError: Failed to execute 'structuredClone': [object Array] could not be cloned`；
     *  2. 只加一层 `toRaw(document.value)` **不够** —— `toRaw` 只解顶层，
     *     `richText` 内容里的数组仍是深层代理，照样抛同一个错。
     *
     * 而且这两个异常**不是** `{ success: false }`，会直接冒泡绕过 `try/catch`，
     * 于是状态永远停在 `pending`（"待保存"）、既不报错也不重试 —— 这正是"保存黑盒"的成因。
     *
     * 可靠做法是**以文本为边界**：`JSON.stringify` 是纯读操作、不克隆，
     * 得到的就是这份文档的纯对象快照。用它同时做校验、内容比对与请求体，
     * 三者语义完全一致（后端也会再校验一次）。
     */
    let submittedInput: string
    let requestDocument: ResumeDocument
    try {
      submittedInput = JSON.stringify(document.value)
      const parsed = resumeDocumentSchema.safeParse(JSON.parse(submittedInput) as ResumeDocument)
      if (!parsed.success) {
        fail(parsed.error.issues[0]?.message ?? '字段不合法')
        return
      }
      requestDocument = parsed.data
    } catch (problem) {
      // 不可序列化 / 解析本身抛异常时也要照实落 `error`，让用户能看到原因并按「立即保存 / 重试」重来。
      fail(problem, '草稿内容无法序列化，请检查自定义模块的富文本内容')
      return
    }
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
      // 失败（或本次提交语义已过期）时不要盲目重排，交给用户按「立即保存 / 重试」；
      // 成功但期间又有新改动（pending）才继续自动保存。
      if (status.value === 'pending' && !isRetry) schedule()
    }
  }
  function schedule() {
    cancelTimer()
    if (!dirty.value && status.value === 'pending') status.value = 'saved'
    // 上一次失败后用户又改了内容 → 之前那条错误信息已经过期，清掉并重新排一次自动保存。
    // （用户没再改时 `schedule()` 不会被调用，所以不会形成失败重试风暴；
    //   手动重试走「立即保存 / 重试」按钮。）
    if (status.value === 'error' && dirty.value) {
      status.value = 'pending'
      error.value = ''
    }
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
    // URL 指定了 id 就加载它，否则走 localStorage 的自动恢复
    const wanted = toValue(initialId ?? null)
    if (wanted) {
      void load(wanted)
    }
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
