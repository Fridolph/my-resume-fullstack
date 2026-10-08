<script setup lang="ts">
import type Sortable from 'sortablejs'
import type { SortableEvent } from 'sortablejs'
import type {
  ResumeContent,
  ResumeDisplayConfig,
  ResumeSectionKey,
  ResumeSlotKey,
} from '#layers/public-resume/app/types/resume'
import { getSectionDefinition, resumeSectionDefinitions } from '#layers/public-resume/app/config/resume-sections'
import { useResumeActiveSection } from '#layers/public-resume/app/composables/useResumeActiveSection'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeBackgroundLayer from './ResumeBackgroundLayer.vue'
import ResumeColumn from './ResumeColumn.vue'

/**
 * 正文容器：布局与拖拽的唯一实现处。
 *
 * - 把区块按「配置顺序 + 栏位归属」分到各栏；三种布局共用同一份 order / slot
 * - 把 `style.id` 作为 `variant` 往下传（结构差异用），并输出 `data-resume-style` 供样式选择
 * - `editable` 时启用跨栏拖拽（sortablejs，仅客户端），拖拽结果交给 useResumeDisplay
 * - `lg` 以下一律单列（移动端优先），DOM 顺序为 side → main → rail
 *
 * 注意：主题 / 风格 CSS 变量**不在这里注入** —— 它们由页面注入到 `<body>`，
 * 好让 teleport 到 body 的抽屉与弹窗也能跟随主题（见 pages/resume/index.vue）。
 */
const props = defineProps<{
  content: ResumeContent
  config: ResumeDisplayConfig
  editable?: boolean
}>()

const emit = defineEmits<{ hide: [key: ResumeSectionKey]; edit: [key: ResumeSectionKey] }>()

const { applyDragResult } = useResumeDisplay()
const { observe, stop: stopActiveSection } = useResumeActiveSection()
const containerRef = useTemplateRef<HTMLElement>('containerRef')

/** 区块归属：配置覆盖 > 注册表默认 */
function slotOf(key: ResumeSectionKey): ResumeSlotKey {
  return props.config.sections.slot[key] ?? getSectionDefinition(key)?.defaultSlot ?? 'main'
}

/** 最终顺序 = 配置顺序 + 未列出的按默认顺序补齐，再过滤隐藏项 */
const orderedKeys = computed(() => {
  const configured = props.config.sections.order.filter((key) => getSectionDefinition(key))
  const rest = resumeSectionDefinitions
    .filter((item) => !configured.includes(item.key))
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((item) => item.key)

  return [...configured, ...rest].filter((key) => !props.config.sections.hidden.includes(key))
})

/** 按布局模式分栏：single 全并入 main；split 把 rail 并入 main */
const columns = computed(() => {
  const mode = props.config.layout.mode
  const buckets: Record<ResumeSlotKey, ResumeSectionKey[]> = { side: [], main: [], rail: [] }

  for (const key of orderedKeys.value) {
    let slot = slotOf(key)
    if (mode === 'single') {
      slot = 'main'
    }
    else if (mode === 'split' && slot === 'rail') {
      slot = 'main'
    }
    buckets[slot].push(key)
  }

  return buckets
})

/**
 * 栅格类必须是**字面量**：Tailwind 扫描源码里的静态字符串，
 * 拼接出来的类名不会生成样式。
 *
 * split 的两档宽度对齐旧站（旧站固定 `lg:320px / xl:360px`）：
 * `compact` ≈ 旧站观感，`wide` 再各宽一档。
 */
const gridClass = computed(() => {
  const { mode, splitSide, sideWidth } = props.config.layout
  const hasSide = columns.value.side.length > 0
  const hasRail = columns.value.rail.length > 0
  const wide = sideWidth === 'wide'

  if (mode === 'threeColumn') {
    if (hasSide && hasRail) {
      return 'lg:grid-cols-[1fr_4fr_1fr]'
    }
    if (hasSide) {
      return 'lg:grid-cols-[1fr_4fr]'
    }
    if (hasRail) {
      return 'lg:grid-cols-[4fr_1fr]'
    }
    return 'lg:grid-cols-1'
  }

  if (mode === 'split' && hasSide) {
    if (splitSide === 'right') {
      return wide
        ? 'lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]'
        : 'lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]'
    }
    return wide
      ? 'lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]'
      : 'lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]'
  }

  return 'lg:grid-cols-1'
})

/** 信息栏与右栏跟随滚动；主内容列不跟随，但通栏时要限宽 */
function columnClass(slot: ResumeSlotKey) {
  const classes: string[] = []

  if (props.config.layout.stickySide && slot !== 'main') {
    classes.push('lg:sticky lg:top-20 lg:self-start')
  }

  // 通栏模式：正文单独限宽并居中 —— 1920 容器下不限制的话单行会接近 1800px，难读
  if (props.config.layout.mode === 'single' && slot === 'main') {
    classes.push('lg:mx-auto lg:max-w-4xl')
  }

  return classes.join(' ')
}

// ── 拖拽（仅客户端、仅编辑态）──────────────────────────
let instances: Sortable[] = []

function destroySortables() {
  instances.forEach((instance) => instance.destroy())
  instances = []
}

/** 用 data-slot 定位栏容器：栏为空时元素不存在，自然跳过 */
function columnElement(slot: ResumeSlotKey) {
  return containerRef.value?.querySelector<HTMLElement>(`[data-slot="${slot}"]`) ?? null
}

async function initSortables() {
  destroySortables()
  if (!import.meta.client || !props.editable) {
    return
  }

  const SortableCtor = (await import('sortablejs')).default

  for (const slot of ['side', 'main', 'rail'] as const) {
    const el = columnElement(slot)
    if (!el) {
      continue
    }

    instances.push(
      SortableCtor.create(el, {
        group: 'resume-sections',
        handle: '[data-drag-handle]',
        animation: 150,
        ghostClass: 'opacity-40',
        onEnd(evt: SortableEvent) {
          const item = evt.item as HTMLElement
          const key = item.dataset.sectionKey as ResumeSectionKey | undefined
          if (!key) {
            return
          }

          const toSlot = ((evt.to as HTMLElement).dataset.slot ?? slot) as ResumeSlotKey
          const next = item.nextElementSibling as HTMLElement | null

          applyDragResult({
            key,
            toSlot,
            anchorKey: next?.dataset.sectionKey as ResumeSectionKey | undefined,
          })
        },
      }),
    )
  }
}

// 正文当前区块（供页面头部显示模块名）
function observeActiveSection() {
  observe(containerRef.value, columns.value.main)
}

onMounted(() => {
  void initSortables()
  observeActiveSection()
})

onBeforeUnmount(() => {
  destroySortables()
  stopActiveSection()
})

watch(
  () => columns.value.main,
  () => {
    void nextTick(observeActiveSection)
  },
)

// 编辑态、布局模式或区块集合变化后，DOM 结构变了，需要重建实例
watch(
  () => [
    props.editable,
    props.config.layout.mode,
    props.config.sections.order.length,
    props.config.sections.hidden.length,
  ],
  () => {
    void nextTick(initSortables)
  },
)
</script>

<template>
  <div
    ref="containerRef"
    class="relative min-h-screen py-8 sm:py-10"
    :data-resume-style="config.style.id"
    :style="{ background: 'var(--resume-page)' }"
  >
    <ResumeBackgroundLayer :background="config.background" :dark="config.theme.dark" />

    <div class="content-max relative grid grid-cols-1 gap-6 px-4 sm:px-6" :class="gridClass">
      <div v-if="columns.side.length" :class="columnClass('side')">
        <ResumeColumn
          slot-key="side"
          :keys="columns.side"
          :content="content"
          :options="config.options"
          :theme="config.theme"
          :variant="config.style.id"
          :editable="editable"
          @hide="emit('hide', $event)"
          @edit="emit('edit', $event)"
        />
      </div>

      <div v-if="columns.main.length" :class="columnClass('main')">
        <ResumeColumn
          slot-key="main"
          :keys="columns.main"
          :content="content"
          :options="config.options"
          :theme="config.theme"
          :variant="config.style.id"
          :editable="editable"
          @hide="emit('hide', $event)"
          @edit="emit('edit', $event)"
        />
      </div>

      <div v-if="columns.rail.length" :class="columnClass('rail')">
        <ResumeColumn
          slot-key="rail"
          :keys="columns.rail"
          :content="content"
          :options="config.options"
          :theme="config.theme"
          :variant="config.style.id"
          :editable="editable"
          @hide="emit('hide', $event)"
          @edit="emit('edit', $event)"
        />
      </div>
    </div>
  </div>
</template>
