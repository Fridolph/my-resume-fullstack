import {
  canonicalResumeJson,
  normalizeApiError,
  defaultResumePdfConfig,
  resumePdfConfigSchema,
  toResumePdfPreset,
  resolveApiErrorMessage,
  type ResumeDocument,
  type ResumePdfConfig,
  type ResumePdfConfigResponse,
  type ResumePdfConfigUpdateDto,
} from '@rs/common'
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/** 宿主注入持久化能力，公共 UI 不推断身份、所有权或接口地址。 */
export interface ResumePdfSettingsAdapter {
  loadPreset: () => Promise<ResumePdfConfigResponse>
  savePreset?: (input: ResumePdfConfigUpdateDto) => Promise<ResumePdfConfigResponse>
  loadConfig?: () => Promise<ResumePdfConfigResponse>
  saveConfig?: (input: ResumePdfConfigUpdateDto) => Promise<ResumePdfConfigResponse>
}

/**
 * 本地编辑、有效预览与持久化分开。非法表单不进入渲染器，保存失败不清输入。
 * 源文档刷新后不覆盖未保存编辑；提示用户主动恢复或重新读取。
 */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function useResumePdfSettings(
  document: MaybeRefOrGetter<ResumeDocument>,
  adapter: MaybeRefOrGetter<ResumePdfSettingsAdapter | undefined>,
) {
  const initial = () => clone(toValue(document).display.pdf ?? defaultResumePdfConfig())
  const draft = ref<ResumePdfConfig>(initial())
  const active = ref<ResumePdfConfig>(initial())
  const saved = ref<ResumePdfConfig | null>(clone(toValue(document).display.pdf ?? null))
  const preset = ref<ResumePdfConfig | null>(null)
  const owned = ref(false)
  const busy = ref(false)
  const message = ref('')
  const error = ref('')
  const validation = computed(() => resumePdfConfigSchema.safeParse(draft.value))
  const invalid = computed(() => !validation.value.success)
  const dirty = computed(
    () => canonicalResumeJson(draft.value) !== canonicalResumeJson(saved.value ?? defaultResumePdfConfig()),
  )
  const canSave = computed(() => owned.value && !!toValue(adapter)?.saveConfig)
  const validationMessage = computed(() =>
    validation.value.success ? '' : validation.value.error.issues[0]?.message || '配置不合法',
  )
  watch(
    draft,
    () => {
      const parsed = resumePdfConfigSchema.safeParse(draft.value)
      if (parsed.success) active.value = parsed.data
    },
    { deep: true },
  )
  watch(
    () => toValue(document),
    value => {
      if (!dirty.value) {
        saved.value = clone(value.display.pdf ?? null)
        draft.value = initial()
        active.value = initial()
      } else message.value = '源简历已刷新，本地配置尚未保存；保存冲突时请先备份，再重新读取。'
    },
    { deep: true },
  )

  /** 404 只表达不可保存当前简历；不妨碍访客调整本次临时导出。 */
  async function load() {
    const api = toValue(adapter)
    if (!api || busy.value) return
    busy.value = true
    error.value = ''
    try {
      preset.value = (await api.loadPreset()).config
      if (api.loadConfig) {
        try {
          const result = await api.loadConfig()
          owned.value = true
          if (!dirty.value) {
            saved.value = clone(result.config)
            draft.value = clone(result.config ?? defaultResumePdfConfig())
          }
        } catch {
          owned.value = false
        }
      }
    } catch (cause) {
      error.value = resolveApiErrorMessage(normalizeApiError(cause))
    } finally {
      busy.value = false
    }
  }

  /** 保存的是点击瞬间快照，保存中禁用编辑；并发冲突不自动重试。 */
  async function save(target: 'resume' | 'preset') {
    const api = toValue(adapter)
    const parsed = resumePdfConfigSchema.safeParse(draft.value)
    if (!api || !parsed.success || busy.value) return
    const action = target === 'resume' ? api.saveConfig : api.savePreset
    if (!action || (target === 'resume' && !owned.value)) return
    busy.value = true
    error.value = ''
    try {
      const config = target === 'preset' ? toResumePdfPreset(parsed.data) : parsed.data
      const result = await action({ config, expectedConfig: target === 'resume' ? saved.value : preset.value })
      if (target === 'resume') saved.value = clone(result.config)
      else preset.value = clone(result.config)
      message.value = target === 'resume' ? '已保存到当前简历' : '公共预设已保存；其他简历不会自动改变'
    } catch (cause) {
      error.value = resolveApiErrorMessage(normalizeApiError(cause))
    } finally {
      busy.value = false
    }
  }

  /** 模块选择属于当前简历，应用公共样式时不携带其他简历实例 ID。 */
  function applyPreset() {
    if (preset.value) draft.value = { ...clone(preset.value), sections: clone(draft.value.sections) }
  }
  function reset() {
    draft.value = defaultResumePdfConfig()
  }
  async function reload() {
    discard()
    await load()
  }
  function discard() {
    saved.value = clone(toValue(document).display.pdf ?? null)
    draft.value = initial()
    error.value = ''
  }
  return {
    draft,
    active,
    dirty,
    invalid,
    validationMessage,
    preset,
    busy,
    message,
    error,
    canSave,
    load,
    save,
    applyPreset,
    reset,
    discard,
    reload,
  }
}
