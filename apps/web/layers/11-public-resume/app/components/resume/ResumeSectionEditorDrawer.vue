<script setup lang="ts">
import type { ResumeSectionKey } from '#layers/public-resume/app/types/resume'
import { resumeEditorSchemas } from '#layers/public-resume/app/config/resume-editor-schemas'
import { getSectionDefinition } from '#layers/public-resume/app/config/resume-sections'
import { useResumeContent } from '#layers/public-resume/app/composables/useResumeContent'
import ResumeSchemaForm from './editors/ResumeSchemaForm.vue'

/**
 * 区块内容编辑抽屉。
 *
 * 只负责「取 schema → 交给通用表单 → 标记改动 / 保存」：
 * 有哪些字段、分几段由 `config/resume-editor-schemas.ts` 决定；
 * 数组定位（含 `profile.links` 这类点号路径）交给 `ResumeSchemaForm`。
 */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ sectionKey: ResumeSectionKey | null }>()

const { content, touch, saveLocal } = useResumeContent()

const schema = computed(() => (props.sectionKey ? resumeEditorSchemas[props.sectionKey] : null))
const title = computed(() =>
  props.sectionKey ? getSectionDefinition(props.sectionKey)?.label ?? props.sectionKey : '',
)

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
        :root="content as unknown as Record<string, unknown>"
        :segments="schema.segments"
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
