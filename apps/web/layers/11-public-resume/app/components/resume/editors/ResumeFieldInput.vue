<script setup lang="ts">
import type { ResumeFieldSchema } from '../../../config/resume-editor-schemas'

/**
 * 单个字段的输入控件（按 schema 的类型分发）。
 *
 * - `text` / `textarea`：直接 emit 新值
 * - `tags`：标签数组，回车添加、点标签删除（emit 新数组，保持不可变）
 */
const props = defineProps<{
  field: ResumeFieldSchema
  value: unknown
}>()

const emit = defineEmits<{ 'update:value': [unknown] }>()

const draft = ref('')

const tags = computed<string[]>(() => (Array.isArray(props.value) ? (props.value as string[]) : []))

function addTag() {
  const text = draft.value.trim()
  if (!text) {
    return
  }
  emit('update:value', [...tags.value, text])
  draft.value = ''
}

function removeTag(index: number) {
  const next = [...tags.value]
  next.splice(index, 1)
  emit('update:value', next)
}
</script>

<template>
  <div v-if="field.type === 'tags'" class="space-y-2">
    <div class="flex flex-wrap gap-1.5">
      <UBadge
        v-for="(tag, index) in tags"
        :key="`${tag}-${index}`"
        color="neutral"
        variant="subtle"
        class="cursor-pointer"
        :title="'点击删除'"
        @click="removeTag(index)"
      >
        {{ tag }} ✕
      </UBadge>
      <span v-if="!tags.length" class="text-xs text-muted">还没有内容</span>
    </div>
    <UInput
      v-model="draft"
      size="sm"
      class="w-full"
      :placeholder="field.placeholder ?? '输入后回车添加'"
      @keyup.enter="addTag"
    />
  </div>

  <UTextarea
    v-else-if="field.type === 'textarea'"
    class="w-full"
    :rows="3"
    :placeholder="field.placeholder"
    :model-value="String(value ?? '')"
    @update:model-value="emit('update:value', String($event))"
  />

  <UInput
    v-else
    class="w-full"
    :placeholder="field.placeholder"
    :model-value="String(value ?? '')"
    @update:model-value="emit('update:value', String($event))"
  />
</template>
