<script setup lang="ts">
import type { ResumeSectionKey } from '#layers/public-resume/app/types/resume'
import { resumeEditorSchemas } from '#layers/public-resume/app/config/resume-editor-schemas'
import { getSectionDefinition } from '#layers/public-resume/app/config/resume-sections'
import { useResumeContent } from '#layers/public-resume/app/composables/useResumeContent'
import ResumeSchemaForm from './editors/ResumeSchemaForm.vue'

/**
 * 区块内容编辑抽屉。
 *
 * 只负责「取 schema → 交给通用表单 → 标脏 / 落盘」：
 * 有哪些字段、分几段由 `config/resume-editor-schemas.ts` 决定；
 * 数组定位（含 `profile.links` 这类点号路径）交给 `ResumeSchemaForm`。
 *
 * 内容与布局一样是**自动保存**（防抖落盘，见 useResumeContent），
 * 所以这里不再有「保存」按钮，只显示状态 + 关闭。
 */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ sectionKey: ResumeSectionKey | null }>()

const { content, touch, saveState, savedAt, flushSave } = useResumeContent()

const schema = computed(() => (props.sectionKey ? resumeEditorSchemas[props.sectionKey] : null))
const title = computed(() =>
  props.sectionKey ? (getSectionDefinition(props.sectionKey)?.label ?? props.sectionKey) : '',
)

const statusText = computed(() => {
  if (saveState.value === 'pending') {
    return '保存中…'
  }
  if (saveState.value === 'saved' && savedAt.value) {
    return '已自动保存'
  }
  return '改动会自动保存'
})

/** 关闭前兜底落盘一次：不在防抖窗口里"看着存了其实还没写" */
function close() {
  flushSave()
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`编辑「${title}」`"
    :ui="{ content: 'max-w-3xl' }"
    :description="'改动实时反映到预览，并自动保存'"
  >
    <template #body>
      <ResumeSchemaForm
        v-if="schema"
        :root="content as unknown as Record<string, unknown>"
        :segments="schema.segments"
        @change="touch"
      />
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="resume-muted text-xs">{{ statusText }}</span>
        <UButton color="neutral" variant="ghost" label="关闭" @click="close" />
      </div>
    </template>
  </UModal>
</template>
