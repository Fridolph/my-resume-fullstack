<script setup lang="ts">
import type { ResumeSectionKey } from '../../types/resume'
import { resumeEditorSchemas } from '../../config/resume-editor-schemas'
import { getSectionDefinition } from '../../config/resume-sections'
import { useResumeContent } from '../../composables/useResumeContent'
import ResumeSchemaForm from './editors/ResumeSchemaForm.vue'

/**
 * 区块内容编辑抽屉。
 *
 * 只负责「取 schema → 交给通用表单 → 标记改动 / 保存」，
 * 具体有哪些字段由 `config/resume-editor-schemas.ts` 决定。
 */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ sectionKey: ResumeSectionKey | null }>()

const { content, touch, saveLocal } = useResumeContent()

const schema = computed(() => (props.sectionKey ? resumeEditorSchemas[props.sectionKey] : null))
const title = computed(() =>
  props.sectionKey ? getSectionDefinition(props.sectionKey)?.label ?? props.sectionKey : '',
)

/** list 模式要编辑的数组：就地在 content 上改 */
const listItems = computed(() => {
  const path = schema.value?.listPath
  if (!path) {
    return undefined
  }
  return (content.value as unknown as Record<string, unknown>)[path] as
    | Record<string, unknown>[]
    | undefined
})

function save() {
  saveLocal()
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`编辑「${title}」`"
    :ui="{ content: 'max-w-3xl' }"
    :description="'改动实时反映到预览；点保存后刷新仍生效'"
  >
    <template #body>
      <ResumeSchemaForm
        v-if="schema"
        :mode="schema.mode"
        :root="content as unknown as Record<string, unknown>"
        :items="listItems"
        :fields="schema.fields"
        :title-key="schema.titleKey"
        :blank="schema.blank"
        @change="touch"
      />
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="text-xs text-muted">内容与布局分开保存，互不影响</span>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" label="关闭" @click="open = false" />
          <UButton icon="i-lucide-save" label="保存" @click="save" />
        </div>
      </div>
    </template>
  </UModal>
</template>
