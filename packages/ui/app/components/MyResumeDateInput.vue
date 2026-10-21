<script setup lang="ts">
import type { FormFieldSchema, ResumeDate } from '@rs/common'
import { formatResumeDate, resumeDayToInput, toResumeDayIso, todayResumeDayIso } from '@rs/common'

/**
 * 日期字段的编辑器（契约里的 `ResumeDate` 判别联合）。
 *
 * ## 为什么需要专门的组件
 *
 * 契约的 `date` 有两种互斥形态：
 * - `custom`：`{ mode: 'custom', text }` —— 自由文本（"2024 年至今""大三暑期"）
 * - `structured`：`{ mode: 'structured', start, end, isCurrent }` —— 可比较的起止日
 *
 * 两者是 `strictObject` 的判别联合，**不能混字段**。一个文本输入框承载不了它，
 * 硬塞会把 `structured` 写成非法形状（这也是当初把它做成只读的原因）。
 *
 * ## 三条不变的规则
 *
 * 1. 切换模式时**整体替换对象**，绝不 merge（`custom` 里出现 `start` 会直接校验失败）
 * 2. 勾「至今」⇒ `end = null`；取消勾选 ⇒ `end` 必须有值（默认取 `start`）
 * 3. 非法日期**不写进契约**：`toResumeDayIso` 返回 `null` 时就停在输入框里，
 *    不让 `2026-02-30` 变成 3 月 2 日溜进库
 */
const props = defineProps<{
  field: FormFieldSchema
  value: unknown
}>()

const emit = defineEmits<{ 'update:value': [unknown] }>()

/** 当前值；缺失时给一个合法的空 `custom`（与字段表 `blank` 的形状一致） */
const current = computed<ResumeDate>(() => {
  const value = props.value as ResumeDate | undefined
  if (value && (value.mode === 'custom' || value.mode === 'structured')) {
    return value
  }
  return { mode: 'custom', text: '' }
})

const isStructured = computed(() => current.value.mode === 'structured')

const startInput = computed(() => (current.value.mode === 'structured' ? resumeDayToInput(current.value.start) : ''))
const endInput = computed(() =>
  current.value.mode === 'structured' && current.value.end ? resumeDayToInput(current.value.end) : '',
)
const isCurrent = computed(() => current.value.mode === 'structured' && current.value.isCurrent)
const customText = computed(() => (current.value.mode === 'custom' ? current.value.text : ''))

const MODE_OPTIONS = [
  { label: '起止日期', value: 'structured' },
  { label: '自定义文本', value: 'custom' },
]

function switchMode(next: string): void {
  if (next === current.value.mode) {
    return
  }

  if (next === 'custom') {
    // 切到自定义：把当前可读摘要填进去（单向预填，不丢已有信息；由用户自行改）
    emit('update:value', { mode: 'custom', text: isStructured.value ? formatResumeDate(current.value) : '' })
    return
  }

  // 切到结构化：**不解析**自由文本（规则一多就会静默猜错），用今天作起点、默认「至今」
  emit('update:value', { mode: 'structured', start: todayResumeDayIso(), end: null, isCurrent: true })
}

function updateStart(value: string): void {
  if (current.value.mode !== 'structured') {
    return
  }
  const iso = toResumeDayIso(value)
  if (!iso) {
    return
  }
  emit('update:value', { ...current.value, start: iso })
}

function updateEnd(value: string): void {
  if (current.value.mode !== 'structured') {
    return
  }
  const iso = toResumeDayIso(value)
  if (!iso) {
    return
  }
  emit('update:value', { ...current.value, end: iso, isCurrent: false })
}

function toggleCurrent(next: boolean): void {
  if (current.value.mode !== 'structured') {
    return
  }
  emit('update:value', {
    ...current.value,
    isCurrent: next,
    end: next ? null : (current.value.end ?? current.value.start),
  })
}

function updateText(value: string): void {
  if (current.value.mode !== 'custom') {
    return
  }
  emit('update:value', { mode: 'custom', text: value })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <USelect
      :model-value="current.mode"
      :items="MODE_OPTIONS"
      value-key="value"
      label-key="label"
      class="w-32"
      @update:model-value="switchMode"
    />

    <div v-if="isStructured" class="flex flex-wrap items-center gap-2">
      <UInput
        :model-value="startInput"
        type="date"
        class="w-40"
        aria-label="开始日期"
        @update:model-value="updateStart"
      />
      <span class="text-muted">~</span>
      <UInput
        :model-value="endInput"
        type="date"
        class="w-40"
        :disabled="isCurrent"
        aria-label="结束日期"
        @update:model-value="updateEnd"
      />
      <USwitch :model-value="isCurrent" label="至今" @update:model-value="toggleCurrent" />
    </div>

    <UInput
      v-else
      :model-value="customText"
      :placeholder="field.placeholder ?? '例如：2024 年至今 / 大三暑期'"
      maxlength="500"
      @update:model-value="updateText"
    />
  </div>
</template>
