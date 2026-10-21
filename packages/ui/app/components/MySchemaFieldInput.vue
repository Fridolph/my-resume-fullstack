<script setup lang="ts">
import type { FormFieldSchema } from '@rs/common'
import MyResumeDateInput from './MyResumeDateInput.vue'

/**
 * 单个字段的输入控件（按 schema 的类型分发）。
 *
 * - `text` / `textarea`：直接 emit 新值
 * - `number`：数字输入（emit `Number`，供能力雷达这类数值字段使用）
 * - `tags`：标签数组，回车添加、点标签删除（emit 新数组，保持不可变）
 * - `textItems`：**契约里的文字条目**（`[{ id, text }]`）。交互与 `tags` 一样，
 *   区别是每条要带稳定 id —— 由组件生成，调用方拿到的就是可直接入库的形状
 *   （契约 `textItem` 要求 id，页面不该各写一遍包装）
 */
const props = defineProps<{
  field: FormFieldSchema
  value: unknown
}>()

const emit = defineEmits<{ 'update:value': [unknown] }>()

/** 契约里的文字条目：`{ id, text }`，与 `resume/document.ts` 的 `textItem` 同形 */
interface TextItem {
  id: string
  text: string
}

const draft = ref('')

const isTagLike = computed(() => props.field.type === 'tags' || props.field.type === 'textItems')

/** 两种标签类字段统一给 UI 一个"字符串数组"视图，渲染分支不必重复写 */
const labels = computed<string[]>(() => {
  if (!Array.isArray(props.value)) {
    return []
  }

  return props.field.type === 'textItems'
    ? (props.value as TextItem[]).map(item => item.text)
    : (props.value as string[])
})

function addEntry() {
  const text = draft.value.trim()
  if (!text) {
    return
  }

  draft.value = ''

  if (props.field.type === 'textItems') {
    const current = Array.isArray(props.value) ? ([...props.value] as TextItem[]) : []
    emit('update:value', [...current, { id: globalThis.crypto.randomUUID(), text }])
    return
  }

  emit('update:value', [...labels.value, text])
}

function removeEntry(index: number) {
  if (props.field.type === 'textItems') {
    const current = Array.isArray(props.value) ? ([...props.value] as TextItem[]) : []
    current.splice(index, 1)
    emit('update:value', current)
    return
  }

  const next = [...labels.value]
  next.splice(index, 1)
  emit('update:value', next)
}
</script>

<template>
  <!-- date：契约里是判别联合，必须整体替换对象（见组件说明） -->
  <MyResumeDateInput
    v-if="field.type === 'date'"
    :field="field"
    :value="value"
    @update:value="emit('update:value', $event)"
  />

  <div v-if="isTagLike" class="space-y-2">
    <div class="flex flex-wrap gap-1.5">
      <UBadge
        v-for="(label, index) in labels"
        :key="`${label}-${index}`"
        color="neutral"
        variant="subtle"
        class="cursor-pointer"
        :title="'点击删除'"
        @click="removeEntry(index)"
      >
        {{ label }} ✕
      </UBadge>
      <span v-if="!labels.length" class="text-xs text-muted">还没有内容</span>
    </div>
    <UInput
      v-model="draft"
      size="sm"
      class="w-full"
      :placeholder="field.placeholder ?? '输入后回车添加'"
      @keyup.enter="addEntry"
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
    v-else-if="field.type === 'number'"
    class="w-full"
    type="number"
    :placeholder="field.placeholder"
    :model-value="value === undefined || value === null ? '' : String(value)"
    @update:model-value="emit('update:value', Number($event))"
  />

  <UInput
    v-else
    class="w-full"
    :placeholder="field.placeholder"
    :model-value="String(value ?? '')"
    @update:model-value="emit('update:value', String($event))"
  />
</template>
