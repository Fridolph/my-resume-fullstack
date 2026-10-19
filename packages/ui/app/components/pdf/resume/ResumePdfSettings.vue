<script setup lang="ts">
import type { ResumeDocument, ResumePdfConfig } from '@rs/common'
import type { ResumePdfSettingsAdapter } from '../../../composables/useResumePdfSettings'
import { useResumePdfSettings } from '../../../composables/useResumePdfSettings'
import ResumePdfConfigPanel from './ResumePdfConfigPanel.vue'
const props = defineProps<{ document: ResumeDocument; adapter?: ResumePdfSettingsAdapter }>()
const emit = defineEmits<{ change: [config: ResumePdfConfig]; invalid: [value: boolean]; saved: [] }>()
const open = ref(false)
const {
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
} = useResumePdfSettings(
  () => props.document,
  () => props.adapter,
)
watch(active, value => emit('change', value), { deep: true, immediate: true })
watch(invalid, value => emit('invalid', value), { immediate: true })
async function persist(target: 'resume' | 'preset') {
  await save(target)
  if (target === 'resume' && !error.value) emit('saved')
}
watch(open, value => {
  if (value) void load()
})
</script>
<template>
  <UButton label="PDF 配置" icon="i-lucide-settings-2" color="neutral" variant="outline" @click="open = true" />
  <span v-if="dirty" class="text-xs text-warning">{{ invalid ? '配置无效' : '配置未保存（可临时导出）' }}</span>
  <USlideover
    v-model:open="open"
    title="PDF 配置"
    description="当前简历独立保存；公共预设通过复制应用，不会联动其他简历。"
    :ui="{ content: 'w-full sm:max-w-md' }"
  >
    <template #body>
      <div class="space-y-4">
        <p v-if="!canSave" class="text-sm text-muted">当前为临时导出配置；本人简历且有展示编辑权限时可保存。</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            label="应用公共预设"
            color="neutral"
            variant="outline"
            :disabled="!preset || busy"
            @click="applyPreset"
          />
          <UButton label="恢复系统默认" color="neutral" variant="ghost" :disabled="busy" @click="reset" />
          <UButton label="重新读取配置" color="neutral" variant="ghost" :disabled="busy" @click="reload" />
          <UButton label="放弃本地修改" color="neutral" variant="ghost" :disabled="busy || !dirty" @click="discard" />
        </div>
        <p v-if="error || invalid" role="alert" class="text-sm text-error">{{ invalid ? validationMessage : error }}</p>
        <p v-if="message" role="status" class="text-sm text-success">{{ message }}</p>
        <ResumePdfConfigPanel v-model="draft" :document="document" :disabled="busy" />
      </div>
    </template>
    <template #footer>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="canSave"
          label="保存到当前简历"
          :disabled="invalid || busy || !dirty"
          :loading="busy"
          @click="persist('resume')"
        />
        <UButton
          v-if="adapter?.savePreset"
          label="保存为公共预设"
          color="neutral"
          variant="outline"
          :disabled="invalid || busy"
          @click="persist('preset')"
        />
        <UButton label="完成配置" color="neutral" variant="ghost" @click="open = false" />
      </div>
    </template>
  </USlideover>
</template>
