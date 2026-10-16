<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import type { Resume, ResumeCompareField } from '~/config/resume-demo'
import { RESUME_STATUS_META } from '~/config/resume-demo'

/**
 * ResumeCompareModal —— 多份简历差异对比弹窗（参考 greensketch OptionCompareModal）。
 *
 * - 响应式壳：桌面 UModal / 移动 UDrawer（ModalResponsive）
 * - PC：一次最多展示 4 列，超出用左右箭头翻页
 * - 移动：两个下拉分别选「左 / 右」两份对比
 * - 字段按 `fields` 配置渲染：section 标题行 + 数据行；`best: min|max` 自动高亮最优
 */
const props = defineProps<{
  options: Resume[]
  fields: ResumeCompareField[]
}>()

const open = defineModel<boolean>('open', { default: false })

const isDesktop = useMediaQuery('(min-width: 768px)', { ssrWidth: 768 })

type RowField = Extract<ResumeCompareField, { name: unknown }>
function isRow(field: ResumeCompareField): field is RowField {
  return 'name' in field
}

function valueOf(field: RowField, opt: Resume): string {
  if (field.value) return field.value(opt)
  return String(opt[field.key as keyof Resume] ?? '-')
}

function numericValue(field: RowField, opt: Resume): number | null {
  const n = Number(valueOf(field, opt))
  return Number.isFinite(n) ? n : null
}

/** 每行「最优值」：min/max，全部相同时不高亮（返回 null 表示无最优） */
const bestMap = computed(() => {
  const map = new Map<number, number>()
  props.fields.forEach((field, i) => {
    if (!isRow(field) || !field.best) return
    const vals = props.options.map(o => numericValue(field, o)).filter((v): v is number => v != null)
    if (new Set(vals).size <= 1) return
    map.set(i, field.best === 'min' ? Math.min(...vals) : Math.max(...vals))
  })
  return map
})

/** 预计算渲染项（标题 / 数据行），避免模板里对 union 做类型收窄 */
interface TitleEntry {
  kind: 'title'
  key: string
  title: string
  icon?: string
}
interface RowEntry {
  kind: 'row'
  key: string
  label: string | ((opt: Resume) => string)
  valueOf: (opt: Resume) => string
  subtextOf?: (opt: Resume) => string
  bestOf: (opt: Resume) => boolean
}

const entries = computed<(TitleEntry | RowEntry)[]>(() => {
  const result: (TitleEntry | RowEntry)[] = []
  props.fields.forEach((field, i) => {
    if (!isRow(field)) {
      result.push({ kind: 'title', key: `t-${i}`, title: field.title, icon: field.icon })
      return
    }
    if (field.hide === true) return
    result.push({
      kind: 'row',
      key: `r-${i}`,
      label: field.name,
      valueOf: (opt: Resume) => valueOf(field, opt),
      subtextOf: field.subtext,
      bestOf: (opt: Resume) => {
        if (!field.best) return false
        const best = bestMap.value.get(i)
        return best != null && numericValue(field, opt) === best
      },
    })
  })
  return result
})

// PC 翻页（最多 4 列）
const MAX_COLS = 4
const range = ref({ start: 0, end: MAX_COLS - 1 })

function toPrev() {
  if (range.value.start > 0) {
    range.value.start--
    range.value.end--
  }
}

function toNext() {
  if (range.value.end < props.options.length - 1) {
    range.value.start++
    range.value.end++
  }
}

// 移动端左右两份（两个下拉交叉禁用，保证不选同一份）
const selectV = ref({ left: 0, right: 1 })
const leftItems = computed(() =>
  props.options.map((o, i) => ({ label: o.name, value: i, disabled: i === selectV.value.right })),
)
const rightItems = computed(() =>
  props.options.map((o, i) => ({ label: o.name, value: i, disabled: i === selectV.value.left })),
)

const showOptionIndex = computed<number[]>(() => {
  if (isDesktop.value) {
    const end = Math.min(range.value.end, props.options.length - 1)
    const idx: number[] = []
    for (let i = range.value.start; i <= end; i++) idx.push(i)
    return idx
  }
  return [selectV.value.left, selectV.value.right]
})
</script>

<template>
  <ModalResponsive v-model:open="open" title="对比" description="对比不同简历版本的差异，绿色渐变高亮最优项">
    <div class="flex flex-col gap-2">
      <!-- PC 翻页 -->
      <div v-if="isDesktop && options.length > MAX_COLS" class="flex justify-between">
        <UButton
          icon="i-lucide-chevron-left"
          variant="ghost"
          color="neutral"
          size="sm"
          :disabled="range.start === 0"
          @click="toPrev"
        />
        <UButton
          icon="i-lucide-chevron-right"
          variant="ghost"
          color="neutral"
          size="sm"
          :disabled="range.end >= options.length - 1"
          @click="toNext"
        />
      </div>

      <!-- 移动端选择器 -->
      <div v-if="!isDesktop" class="grid grid-cols-2 gap-3">
        <USelect v-model="selectV.left" :items="leftItems" size="sm" />
        <USelect v-model="selectV.right" :items="rightItems" size="sm" />
      </div>

      <!-- 表头：option 名称 + 状态 -->
      <div class="flex items-start gap-4 border-b-2 border-default pb-3 pt-2">
        <div v-for="idx in showOptionIndex" :key="options[idx]!.id" class="min-w-0 flex-1">
          <p class="truncate font-medium text-highlighted">{{ options[idx]!.name }}</p>
          <UBadge
            variant="soft"
            :label="RESUME_STATUS_META[options[idx]!.status].label"
            :ui="{
              base: `mt-1 px-1 py-0 rounded-sm ${RESUME_STATUS_META[options[idx]!.status].class}`,
            }"
          />
        </div>
      </div>

      <!-- 字段行 -->
      <template v-for="entry in entries" :key="entry.key">
        <div
          v-if="entry.kind === 'title'"
          class="flex items-center gap-2 border-b border-default pb-2 pt-4 text-sm font-semibold text-highlighted"
        >
          <UIcon v-if="entry.icon" :name="entry.icon" class="size-4 text-primary" />
          <span>{{ entry.title }}</span>
        </div>

        <ResumeCompareRow
          v-else
          :label="entry.label"
          :options="options"
          :show-option-index="showOptionIndex"
          :value-of="entry.valueOf"
          :subtext-of="entry.subtextOf"
          :best-of="entry.bestOf"
        />
      </template>
    </div>
  </ModalResponsive>
</template>
