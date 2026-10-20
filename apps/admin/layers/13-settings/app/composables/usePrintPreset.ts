import {
  canonicalResumeJson,
  defaultResumePdfConfig,
  normalizeApiError,
  resolveApiErrorMessage,
  resumePdfConfigSchema,
  toResumePdfPreset,
  type ResumePdfConfig,
} from '@rs/common'
import { computed, ref, shallowRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import { onBeforeRouteLeave } from 'vue-router'
import ModalConfirm from '#layers/ui/app/components/modal/Confirm.vue'
import { createResumePdfPresetApi } from '../../../11-resume/app/apis/resume-pdf-config'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * 本人打印预设的显式编辑周期。null表示未保存过，不能用系统默认冒充服务端旧值。
 * 首次读取失败禁止保存；409保留本地输入，重新读取须经用户确认，不自动覆盖。
 */
export function usePrintPreset() {
  const api = createResumePdfPresetApi()
  const confirmation = useOverlay().create(ModalConfirm)
  const confirming = shallowRef(false)
  const draft = ref<ResumePdfConfig>(defaultResumePdfConfig())
  const saved = shallowRef<ResumePdfConfig | null>(null)
  const loaded = shallowRef(false)
  const busy = shallowRef(false)
  const error = shallowRef('')
  const message = shallowRef('')
  const validation = computed(() => resumePdfConfigSchema.safeParse(draft.value))
  const invalid = computed(() => !validation.value.success)
  const validationMessage = computed(() =>
    validation.value.success
      ? ''
      : `${validation.value.error.issues[0]?.path.join('.')}：${validation.value.error.issues[0]?.message}`,
  )
  const dirty = computed(
    () =>
      loaded.value && canonicalResumeJson(draft.value) !== canonicalResumeJson(saved.value ?? defaultResumePdfConfig()),
  )

  /** 以确认按钮回调区分确认与取消，防止公共弹窗 close 事件的真值误触发覆盖。 */
  async function confirmChange(title: string, content: string) {
    if (busy.value || confirming.value) return false
    confirming.value = true
    let accepted = false
    try {
      await confirmation.open({
        title,
        content,
        cancelText: '取消',
        confirmText: '确认',
        confirm: () => {
          accepted = true
        },
      }).result
      return accepted
    } finally {
      confirming.value = false
    }
  }

  /** 只有成功响应才能建立乐观锁基线，未知旧值时绝不允许写回。 */
  async function load() {
    if (busy.value) return
    busy.value = true
    error.value = ''
    message.value = ''
    loaded.value = false
    try {
      const result = await api.loadPreset()
      saved.value = clone(result.config)
      draft.value = clone(result.config ?? defaultResumePdfConfig())
      loaded.value = true
    } catch (cause) {
      error.value = resolveApiErrorMessage(normalizeApiError(cause))
    } finally {
      busy.value = false
    }
  }

  /** 保存确认后的合法快照；服务端冲突不重试，输入仍留在表单。 */
  async function save() {
    if (!loaded.value || busy.value || !validation.value.success) return
    if (!(await confirmChange('保存打印预设？', '将更新本人公共打印预设，用于之后新增的简历；已有简历保持原配置。')))
      return
    if (!loaded.value || busy.value || !validation.value.success) return
    const config = toResumePdfPreset(validation.value.data)
    busy.value = true
    error.value = ''
    message.value = ''
    try {
      const result = await api.savePreset({ config, expectedConfig: clone(saved.value) })
      saved.value = clone(result.config)
      draft.value = clone(result.config ?? config)
      message.value = '打印预设已保存，将用于本人之后新增的简历；已有简历保持原配置。'
    } catch (cause) {
      error.value = resolveApiErrorMessage(normalizeApiError(cause))
    } finally {
      busy.value = false
    }
  }

  async function reset() {
    if (!loaded.value || busy.value) return
    if (!(await confirmChange('恢复系统默认？', '将替换本地未保存的打印预设；点击保存后才会更新公共预设。'))) return
    draft.value = defaultResumePdfConfig()
    message.value = ''
    error.value = ''
  }

  async function discard() {
    if (!loaded.value || busy.value) return
    if (!(await confirmChange('放弃修改？', '将恢复上次读取或保存的公共预设，未保存的调整无法恢复。'))) return
    draft.value = clone(saved.value ?? defaultResumePdfConfig())
    message.value = ''
    error.value = ''
  }

  async function reload() {
    if (dirty.value && !(await confirmChange('重新读取？', '将放弃未保存的打印预设，并读取服务端最新配置。'))) return
    await load()
  }

  useEventListener('beforeunload', event => {
    if (!dirty.value) return
    event.preventDefault()
    event.returnValue = ''
  })
  onBeforeRouteLeave(() => !dirty.value || confirmChange('离开打印预设？', '打印预设尚未保存，离开将放弃本地修改。'))

  return {
    draft,
    saved,
    loaded,
    busy,
    error,
    message,
    invalid,
    validationMessage,
    dirty,
    load,
    save,
    reset,
    discard,
    reload,
  }
}
