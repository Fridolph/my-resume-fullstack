import {
  canonicalResumeJson,
  normalizeApiError,
  defaultResumePdfConfig,
  resumePdfConfigSchema,
  resolveApiErrorMessage,
  type ResumeDocument,
  type ResumePdfConfig,
  type ResumePdfConfigResponse,
  type ResumePdfConfigUpdateDto,
} from '@rs/common'
import { computed, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'

/** 宿主注入持久化能力，公共 UI 不推断身份、所有权或接口地址。 */
export interface ResumePdfSettingsAdapter {
  loadPreset: () => Promise<ResumePdfConfigResponse>
  savePreset?: (input: ResumePdfConfigUpdateDto) => Promise<ResumePdfConfigResponse>
  loadConfig?: () => Promise<ResumePdfConfigResponse>
  saveConfig?: (input: ResumePdfConfigUpdateDto) => Promise<ResumePdfConfigResponse>
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * 表单实时驱动预览，显式保存才持久化。公共预设与本人配置独立读取，任一失败不阻断另一项。
 * 当前配置读取成功后才允许保存；CAS 失败保留编辑与原基线，不自动覆盖或重试。
 */
export function useResumePdfSettings(
  document: MaybeRefOrGetter<ResumeDocument>,
  adapter: MaybeRefOrGetter<ResumePdfSettingsAdapter | undefined>,
) {
  const initial = () => clone(toValue(document).display.pdf ?? defaultResumePdfConfig())
  const draft = ref<ResumePdfConfig>(initial())
  const active = ref<ResumePdfConfig>(initial())
  const saved = ref<ResumePdfConfig | null>(clone(toValue(document).display.pdf ?? null))
  const preset = ref<ResumePdfConfig | null>(null)
  const configLoaded = shallowRef(false)
  const readOnly = shallowRef(false)
  const loadFailed = shallowRef(false)
  const loading = shallowRef(false)
  const saving = shallowRef(false)
  const message = shallowRef('')
  const error = shallowRef('')
  const presetError = shallowRef('')
  const busy = computed(() => loading.value || saving.value)
  const validation = computed(() => resumePdfConfigSchema.safeParse(draft.value))
  const invalid = computed(() => !validation.value.success)
  const dirty = computed(
    () => canonicalResumeJson(draft.value) !== canonicalResumeJson(saved.value ?? defaultResumePdfConfig()),
  )
  const showSave = computed(() => !!toValue(adapter)?.saveConfig && !readOnly.value)
  const canSave = computed(() => showSave.value && configLoaded.value && !loadFailed.value)
  const validationMessage = computed(() =>
    validation.value.success ? '' : validation.value.error.issues[0]?.message || '配置不合法',
  )
  watch(
    draft,
    () => {
      message.value = ''
      const parsed = resumePdfConfigSchema.safeParse(draft.value)
      if (parsed.success) active.value = parsed.data
    },
    { deep: true, flush: 'sync' },
  )
  watch(
    () => toValue(document),
    value => {
      // 网页展示可能仍是旧发布版本；已读到的本人草稿配置才是保存/放弃的基线。
      if (configLoaded.value) return
      if (!dirty.value) {
        saved.value = clone(value.display.pdf ?? null)
        draft.value = initial()
        active.value = initial()
      }
    },
    { deep: true },
  )

  /**
   * 普通读取保留未保存编辑及其 CAS 基线；显式重读仅在接口成功后替换本地内容。
   * 403/404 表示当前配置只读，500/断网则保留重试入口，不冒充无权限或空配置。
   */
  async function load(replaceLocal = false) {
    const api = toValue(adapter)
    if (!api || busy.value) return
    loading.value = true
    error.value = ''
    loadFailed.value = false
    presetError.value = ''
    try {
      await Promise.all([
        (async () => {
          try {
            preset.value = clone((await api.loadPreset()).config)
          } catch {
            preset.value = null
            presetError.value = '公共预设暂不可用；可继续调整当前预览。'
          }
        })(),
        (async () => {
          if (!api.loadConfig) return
          try {
            const result = await api.loadConfig()
            const replaceDraft = replaceLocal || !dirty.value
            if (replaceDraft || !configLoaded.value) saved.value = clone(result.config)
            if (replaceDraft) draft.value = clone(result.config ?? defaultResumePdfConfig())
            configLoaded.value = true
            readOnly.value = false
          } catch (cause) {
            const normalized = normalizeApiError(cause)
            loadFailed.value = true
            readOnly.value = [401, 403, 404].includes(normalized.code)
            if (!readOnly.value) error.value = `当前配置读取失败：${resolveApiErrorMessage(normalized)}`
          }
        })(),
      ])
    } finally {
      loading.value = false
    }
  }

  /** 保存点击瞬间快照；只有真实成功才返回 true，防止空操作或失败被宿主误认为已保存。 */
  async function save(): Promise<boolean> {
    const api = toValue(adapter)
    const parsed = resumePdfConfigSchema.safeParse(draft.value)
    if (!api?.saveConfig || !parsed.success || busy.value || !canSave.value || !dirty.value) return false
    saving.value = true
    error.value = ''
    message.value = ''
    try {
      const result = await api.saveConfig({ config: clone(parsed.data), expectedConfig: clone(saved.value) })
      saved.value = clone(result.config)
      message.value = '配置已保存到当前简历'
      return true
    } catch (cause) {
      const normalized = normalizeApiError(cause)
      error.value =
        normalized.code === 409
          ? '配置已被其他窗口修改。本地调整已保留，请备份后重新读取配置。'
          : `保存失败：${resolveApiErrorMessage(normalized)}`
      return false
    } finally {
      saving.value = false
    }
  }

  /** 公共预设不携带其他简历的实例 ID，应用时保留当前模块编排。 */
  function applyPreset() {
    if (preset.value) draft.value = { ...clone(preset.value), sections: clone(draft.value.sections) }
  }
  function reset() {
    draft.value = defaultResumePdfConfig()
  }
  async function reload() {
    await load(true)
  }
  /** 恢复最近一次成功读取/保存的基线，不回退到可能过期的网页发布内容。 */
  function discard() {
    draft.value = clone(saved.value ?? defaultResumePdfConfig())
    message.value = ''
  }
  return {
    draft,
    active,
    dirty,
    invalid,
    validationMessage,
    preset,
    busy,
    loading,
    saving,
    message,
    error,
    presetError,
    showSave,
    canSave,
    load,
    save,
    applyPreset,
    reset,
    discard,
    reload,
  }
}
