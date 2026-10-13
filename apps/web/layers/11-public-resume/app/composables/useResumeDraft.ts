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
  function adopt(response: ResumeDraftResponse) {
    resumeDocumentSchema.parse(response.document)
    draft.value = response
    document.value = structuredClone(response.document)
    status.value = 'saved'
    error.value = ''
    // resume.id 现为 integer 自增主键；localStorage 只能存字符串，URL 参数也是字符串，故此处转一下
    if (import.meta.client) localStorage.setItem(`my-resume.draft-id.${user.value?.id}`, String(response.resume.id))
  }
  function fail(problem: unknown) {
    const normalized = normalizeApiError(problem)
    reauthRequired.value = normalized.code === 401
    status.value = normalized.errorCode === 'Resume.Draft:conflict' ? 'conflict' : 'error'
    error.value = normalized.message || '请求失败，请稍后重试'
  }
  async function load(id: string) {
    cancelTimer()
    const expected = ++generation
    status.value = 'loading'
    error.value = ''
    try {
      const result = await api.read(id)
      if (expected === generation) adopt(result)
    } catch (problem) {
      if (expected === generation) fail(problem)
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
    const id = isAuthed.value ? localStorage.getItem(`my-resume.draft-id.${user.value?.id}`) : null
    if (id) void load(id)
  }
  watch(
    () => user.value?.id,
    () => {
      cancelTimer()
      generation++
      draft.value = null
      document.value = null
      error.value = ''
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
  return { draft, document, status, error, dirty, canEdit, reauthRequired, create, load, save, backup }
}
