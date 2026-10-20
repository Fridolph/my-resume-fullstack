<script setup lang="ts">
import type { ResumeDocument, ResumePdfConfig } from '@rs/common'
import type { ResumePdfSettingsAdapter } from '../../../composables/useResumePdfSettings'
import { useResumePdfSettings } from '../../../composables/useResumePdfSettings'
import ResumePdfConfigPanel from './ResumePdfConfigPanel.vue'
import ModalConfirm from '../../modal/Confirm.vue'
const props = defineProps<{ document: ResumeDocument; adapter?: ResumePdfSettingsAdapter }>()
const emit = defineEmits<{ change: [config: ResumePdfConfig]; invalid: [value: boolean]; saved: [] }>()
const open = ref(false)
const confirmation = useOverlay().create(ModalConfirm)
const confirming = shallowRef(false)
const description = computed(() =>
  canSave.value
    ? '修改实时预览，点击“保存配置”后持久化；关闭面板不会自动保存。'
    : '修改实时预览；本人简历且有展示编辑权限时可保存，否则仅用于本次导出。',
)
const {
  draft,
  active,
  dirty,
  invalid,
  validationMessage,
  preset,
  busy,
  loading,
  saving,
  showSave,
  presetError,
  message,
  error,
  canSave,
  load,
  save,
  applyPreset,
  reset,
  discard,
  reload,
} = useResumePdfSettings(
  () => props.document,
  () => props.adapter,
)
watch(active, value => emit('change', value), { deep: true, immediate: true })
watch(invalid, value => emit('invalid', value), { immediate: true })
/** 取消只关闭弹窗；确认后才执行覆盖或丢弃操作，公共弹窗的 close 值不作为确认结果。 */
async function confirmChange(title: string, content: string, action: () => void | Promise<void>) {
  if (busy.value || confirming.value) return
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
    if (accepted && !busy.value) await action()
  } finally {
    confirming.value = false
  }
}
async function persist() {
  if (await save()) emit('saved')
}
onMounted(() => {
  void load()
})
watch(open, value => {
  if (value) void load()
})
</script>
<template>
  <UButton label="PDF 配置" icon="i-lucide-settings-2" color="neutral" variant="outline" @click="open = true" />
  <span v-if="dirty" class="text-xs text-warning">{{ invalid ? '配置无效' : '配置未保存（可临时导出）' }}</span>
  <USlideover v-model:open="open" title="PDF 配置" :description="description">
    <template #body>
      <div class="space-y-4">
        <p v-if="loading" role="status" class="text-sm text-muted">正在读取配置…</p>
        <p v-if="presetError" role="status" class="text-sm text-warning">{{ presetError }}</p>
        <ResumePdfConfigPanel v-model="draft" :document="document" :disabled="busy" />
      </div>
    </template>
    <template #footer>
      <div class="w-full space-y-3" :aria-busy="busy">
        <p v-if="error || invalid" role="alert" class="text-sm text-error">{{ invalid ? validationMessage : error }}</p>
        <p v-if="message" role="status" class="text-sm text-success">{{ message }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-if="showSave"
            :label="saving ? '保存中…' : '保存配置'"
            :disabled="!canSave || invalid || busy || confirming || !dirty"
            :loading="saving"
            @click="persist"
          />
          <UButton
            label="应用公共预设"
            color="neutral"
            variant="outline"
            :disabled="!preset || busy || confirming"
            @click="
              confirmChange(
                '应用公共预设？',
                '将替换本地纸面样式并保留当前模块编排；保存配置后才会持久化。',
                applyPreset,
              )
            "
          />
          <UButton
            label="恢复默认"
            color="neutral"
            variant="outline"
            :disabled="busy || confirming"
            @click="confirmChange('恢复系统默认？', '将替换本地全部 PDF 配置，包含模块编排；保存后才会持久化。', reset)"
          />
          <UButton
            label="放弃修改"
            color="neutral"
            variant="outline"
            :disabled="busy || confirming || !dirty"
            @click="confirmChange('放弃本地修改？', '将恢复最近一次已保存配置，未保存的调整无法恢复。', discard)"
          />
          <UButton
            v-if="error || presetError"
            label="重新读取"
            color="neutral"
            variant="outline"
            :disabled="busy || confirming"
            @click="confirmChange('重新读取配置？', '读取成功后将替换本地未保存修改；读取失败会保留当前调整。', reload)"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
