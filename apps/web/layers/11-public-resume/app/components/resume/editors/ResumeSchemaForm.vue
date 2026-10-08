<script setup lang="ts">
import type { ResumeFieldGroupSchema } from '#layers/public-resume/app/config/resume-editor-schemas'
import ResumeFieldInput from './ResumeFieldInput.vue'

/**
 * 通用字段表单（schema 驱动，支持多段）。
 *
 * 每段要么是 `fields`（按点号路径直接改根对象上的字段，如 `profile.hero.slogans`），
 * 要么是 `list`（编辑根对象上的某个数组，**路径同样支持点号**，如 `profile.links`）。
 *
 * 区块要加字段只改 `config/resume-editor-schemas.ts`；要加「一段」也不用动这里。
 * 数组的定位在这里完成，所以抽屉不需要知道 `listPath` 怎么写。
 */
const props = defineProps<{
  /** 编辑的根对象（这里是 `ResumeContent`） */
  root?: Record<string, unknown>
  segments: ResumeFieldGroupSchema[]
}>()

const emit = defineEmits<{ change: [] }>()

/**
 * 就地改数组项的某个字段并标记改动。
 *
 * 模板里**不要**写多语句内联表达式（`x = $event; emit(...)`）——
 * oxfmt 会把它们折成多行，而 Vue 模板属性中的多语句表达式非法（构建期报
 * `Error parsing JavaScript expression`）。统一收敛成方法调用。
 */
function setItemValue(item: Record<string, unknown>, key: string, value: unknown) {
  item[key] = value
  emit('change')
}

function readPath(path: string, base?: unknown): unknown {
  const start = base ?? props.root

  return path.split('.').reduce<unknown>((acc, key) => {
    return acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined
  }, start)
}

function writePath(path: string, value: unknown) {
  const keys = path.split('.')
  const last = keys.pop() as string
  const target = keys.reduce<Record<string, unknown>>(
    (acc, key) => {
      return acc[key] as Record<string, unknown>
    },
    props.root as Record<string, unknown>,
  )

  target[last] = value
  emit('change')
}

/** 段内的数组（`list` 模式）：路径可含点号，如 `profile.links` */
function itemsOf(segment: ResumeFieldGroupSchema): Record<string, unknown>[] | undefined {
  if (!segment.listPath) {
    return undefined
  }

  return readPath(segment.listPath) as Record<string, unknown>[] | undefined
}

function addItem(segment: ResumeFieldGroupSchema) {
  itemsOf(segment)?.push(structuredClone(segment.blank ?? {}))
  emit('change')
}

function removeItem(segment: ResumeFieldGroupSchema, index: number) {
  itemsOf(segment)?.splice(index, 1)
  emit('change')
}

function moveItem(segment: ResumeFieldGroupSchema, index: number, delta: number) {
  const list = itemsOf(segment)
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
  <div class="space-y-8">
    <section v-for="(segment, segmentIndex) in segments" :key="segmentIndex" class="space-y-4">
      <p
        v-if="segment.label"
        class="border-b pb-2 text-sm font-semibold"
        :style="{ borderColor: 'var(--resume-border)' }"
      >
        {{ segment.label }}
      </p>

      <!-- fields：直接改字段 -->
      <div v-if="segment.mode === 'fields'" class="grid gap-4 sm:grid-cols-2">
        <UFormField
          v-for="field in segment.fields"
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

      <!-- list：增删 / 上下移动数组项 -->
      <template v-else>
        <UCard v-for="(item, index) in itemsOf(segment)" :key="index" :ui="{ body: 'space-y-4 p-4 sm:p-4' }">
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-sm font-medium">
              {{ segment.titleKey ? String(item[segment.titleKey] ?? `第 ${index + 1} 项`) : `第 ${index + 1} 项` }}
            </p>
            <div class="flex shrink-0 items-center gap-1">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-up"
                :disabled="index === 0"
                aria-label="上移"
                @click="moveItem(segment, index, -1)"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-down"
                :disabled="index === (itemsOf(segment)?.length ?? 1) - 1"
                aria-label="下移"
                @click="moveItem(segment, index, 1)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="删除这一项"
                @click="removeItem(segment, index)"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              v-for="field in segment.fields"
              :key="field.key"
              :label="field.label"
              :class="field.wide ? 'sm:col-span-2' : ''"
            >
              <ResumeFieldInput
                :field="field"
                :value="item[field.key ?? '']"
                @update:value="setItemValue(item, field.key ?? '', $event)"
              />
            </UFormField>
          </div>
        </UCard>

        <UButton size="sm" variant="outline" icon="i-lucide-plus" label="新增一项" @click="addItem(segment)" />
      </template>
    </section>
  </div>
</template>
