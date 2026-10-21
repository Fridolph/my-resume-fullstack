<script setup lang="ts">
import type { FormFieldSchema, ResumeDate } from '@rs/common'
import { formatResumeDate, resumeDayToInput, toResumeDayIso, todayResumeDayIso } from '@rs/common'
import { parseDate, type DateValue } from '@internationalized/date'

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

// ── 日期字段（契约里是判别联合，用 `UCalendar` 的 range 模式选起止日）──────────
//
// 与其它字段最本质的区别：它的 v-model 值是一个 `ResumeDate` **对象**，
// 所以每次改动都是**整体替换**（`custom` 与 `structured` 是 strictObject 的判别联合，
// 混字段会直接校验失败）。

/** 当前值；缺失时给一个合法的空 `custom`（与字段表 `blank` 的形状一致） */
const dateValue = computed<ResumeDate>(() => {
  const value = props.value as ResumeDate | undefined
  if (value && (value.mode === 'custom' || value.mode === 'structured')) {
    return value
  }
  return { mode: 'custom', text: '' }
})

/** 存储形态（UTC 零点 ISO）⇄ `CalendarDate`：`toString()` 就是 `YYYY-MM-DD` */
const dateRange = computed<{ start?: DateValue; end?: DateValue }>(() => {
  const value = dateValue.value
  if (value.mode !== 'structured') {
    return {}
  }
  return {
    start: parseDate(resumeDayToInput(value.start)),
    end: value.end ? parseDate(resumeDayToInput(value.end)) : undefined,
  }
})

const dateLabel = computed(() => {
  const value = dateValue.value
  if (value.mode === 'custom') {
    return value.text.trim() === '' ? '选择时间' : value.text
  }
  return formatResumeDate(value)
})

const customDateText = computed(() => (dateValue.value.mode === 'custom' ? dateValue.value.text : ''))

/**
 * `UCalendar` 的 range 事件参数是 Nuxt UI 的内部类型 `DateRange`（不是本包的依赖，
 * 且与"可选起止"的形状不完全一致）。这里收一次口：模板只传 `unknown`，
 * 转换与校验都在脚本里 —— 不在模板里写类型断言。
 */
function onDateRangeChange(next: unknown): void {
  updateDateRange((next ?? null) as { start?: DateValue | null; end?: DateValue | null } | null)
}

function updateDateRange(next: { start?: DateValue | null; end?: DateValue | null } | null): void {
  const value = dateValue.value
  if (value.mode !== 'structured' || !next?.start) {
    return
  }
  const start = toResumeDayIso(next.start.toString())
  const end = next.end ? toResumeDayIso(next.end.toString()) : null
  if (!start) {
    return
  }
  // 契约要求：没有结束日就是「至今」。所以只选了起点时 isCurrent 自动为 true。
  emit('update:value', { mode: 'structured', start, end, isCurrent: end === null })
}

/**
 * 「至今」开关。
 *
 * ⚠️ `UCalendar` 的 range 模式**要求有 end**，而「至今」没有结束日。
 * 处理方式是：**显示用今天，契约存 null** —— 勾选时结束日不写入。
 */
function toggleDateCurrent(next: boolean): void {
  const value = dateValue.value
  if (value.mode !== 'structured') {
    return
  }
  emit('update:value', { ...value, isCurrent: next, end: next ? null : value.start })
}

function switchDateMode(): void {
  const value = dateValue.value
  if (value.mode === 'structured') {
    // 切到自定义：把可读摘要预填进去（单向，不丢信息；由用户自行改）
    emit('update:value', { mode: 'custom', text: formatResumeDate(value) })
    return
  }
  // 切到结构化：**不解析**自由文本（规则一多就静默猜错），用今天作起点、默认「至今」
  emit('update:value', { mode: 'structured', start: todayResumeDayIso(), end: null, isCurrent: true })
}

function updateCustomDateText(next: string): void {
  emit('update:value', { mode: 'custom', text: next })
}

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
  <UPopover v-if="field.type === 'date'" :content="{ align: 'start' }">
    <UButton color="neutral" variant="subtle" icon="i-lucide-calendar" :label="dateLabel" />

    <template #content>
      <div class="flex flex-col gap-2 p-2">
        <UCalendar
          v-if="dateValue.mode === 'structured'"
          :model-value="dateRange as never"
          range
          locale="zh-CN"
          class="p-2"
          @update:model-value="onDateRangeChange"
        />
        <UInput
          v-else
          :model-value="customDateText"
          placeholder="例如：2024 年至今 / 大三暑期"
          maxlength="500"
          class="w-72"
          @update:model-value="updateCustomDateText"
        />

        <div
          v-if="dateValue.mode === 'structured'"
          class="flex items-center justify-between gap-2 border-t border-default px-2 pt-2"
        >
          <USwitch :model-value="dateValue.isCurrent" label="至今" @update:model-value="toggleDateCurrent" />
          <span class="text-xs text-muted">勾选后不写结束日</span>
        </div>

        <div class="flex justify-end border-t border-default px-2 pt-2">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :label="dateValue.mode === 'structured' ? '改用自定义文本' : '改用起止日期'"
            @click="switchDateMode"
          />
        </div>
      </div>
    </template>
  </UPopover>

  <!-- 接在 date 分支之后：必须用 v-else-if，否则日期字段会同时渲染下面这条链的兜底输入框 -->
  <div v-else-if="isTagLike" class="space-y-2">
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
