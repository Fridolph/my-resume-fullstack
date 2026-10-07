<script setup lang="ts">
import type { ResumeFieldSchema } from '../../../config/resume-editor-schemas'
import ResumeFieldInput from './ResumeFieldInput.vue'

/**
 * 通用字段表单（schema 驱动）。
 *
 * - `fields`：直接编辑根对象上的若干字段（路径可含点号，如 `profile.name`）
 * - `list`：编辑根对象上的某个数组（增删项 / 上下移动 / 项内字段）
 *
 * 区块要加字段，只改 `config/resume-editor-schemas.ts`，不用动这里。
 */
const props = defineProps<{
  mode: 'fields' | 'list'
  root?: Record<string, unknown>
  items?: Record<string, unknown>[]
  fields: ResumeFieldSchema[]
  titleKey?: string
  blank?: Record<string, unknown>
}>()

const emit = defineEmits<{ change: [] }>()

function readPath(path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    return acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined
  }, props.root)
}

function writePath(path: string, value: unknown) {
  const keys = path.split('.')
  const last = keys.pop() as string
  const target = keys.reduce<Record<string, unknown>>((acc, key) => {
    return acc[key] as Record<string, unknown>
  }, props.root as Record<string, unknown>)

  target[last] = value
  emit('change')
}

function addItem() {
  props.items?.push(structuredClone(props.blank ?? {}))
  emit('change')
}

function removeItem(index: number) {
  props.items?.splice(index, 1)
  emit('change')
}

function moveItem(index: number, delta: number) {
  const list = props.items
  const target = index + delta
  if (!list || target < 0 || target >= list.length) {
    return
  }
  const [item] = list.splice(index, 1)
  if (item) {
    list.splice(target, 0, item)
  }
  emit('change')
}
</script>

<template>
  <!-- fields 模式 -->
  <div v-if="mode === 'fields'" class="grid gap-4 sm:grid-cols-2">
    <UFormField
      v-for="field in fields"
      :key="field.path"
      :label="field.label"
      :class="field.wide ? 'sm:col-span-2' : ''"
    >
      <ResumeFieldInput
        :field="field"
        :value="readPath(field.path ?? '')"
        @update:value="writePath(field.path ?? '', $event)"
      />
    </UFormField>
  </div>

  <!-- list 模式 -->
  <div v-else class="space-y-4">
    <UCard
      v-for="(item, index) in items"
      :key="index"
      :ui="{ body: 'space-y-4 p-4 sm:p-4' }"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="truncate text-sm font-medium">
          {{ titleKey ? String(item[titleKey] ?? `第 ${index + 1} 项`) : `第 ${index + 1} 项` }}
        </p>
        <div class="flex shrink-0 items-center gap-1">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-up"
            :disabled="index === 0"
            aria-label="上移"
            @click="moveItem(index, -1)"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-down"
            :disabled="index === (items?.length ?? 1) - 1"
            aria-label="下移"
            @click="moveItem(index, 1)"
          />
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            aria-label="删除这一项"
            @click="removeItem(index)"
          />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          v-for="field in fields"
          :key="field.key"
          :label="field.label"
          :class="field.wide ? 'sm:col-span-2' : ''"
        >
          <ResumeFieldInput
            :field="field"
            :value="item[field.key ?? '']"
            @update:value="item[field.key ?? ''] = $event; emit('change')"
          />
        </UFormField>
      </div>
    </UCard>

    <UButton size="sm" variant="outline" icon="i-lucide-plus" label="新增一项" @click="addItem" />
  </div>
</template>
