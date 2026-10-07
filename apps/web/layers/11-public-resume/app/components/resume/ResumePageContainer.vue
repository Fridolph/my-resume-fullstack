<script setup lang="ts">
import type Sortable from 'sortablejs'
import type { SortableEvent } from 'sortablejs'
import type {
  ResumeContent,
  ResumeDisplayConfig,
  ResumeSectionKey,
  ResumeSlotKey,
} from '../../types/resume'
import { getSectionDefinition, resumeSectionDefinitions } from '../../config/resume-sections'
import { useResumeActiveSection } from '../../composables/useResumeActiveSection'
import { useResumeDisplay } from '../../composables/useResumeDisplay'
import ResumeBackgroundLayer from './ResumeBackgroundLayer.vue'
import ResumeColumn from './ResumeColumn.vue'

/**
 * 正文容器：布局与拖拽的唯一实现处。
 *
 * - 注入主题与**风格** CSS 变量 + 背景层
 * - 把区块按「配置顺序 + 栏位归属」分到三栏；三种布局共用同一份 order / slot
 * - 把 `style.id` 作为 `variant` 往下传（结构差异用），并输出 `data-resume-style` 供样式选择
 * - `editable` 时启用跨栏拖拽（sortablejs，仅客户端），拖拽结果交给 useResumeDisplay
 * - `lg` 以下一律单列（移动端优先），DOM 顺序为 side → main → rail
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
 */
const gridClass = computed(() => {
  const { mode, splitSide, sideWidth } = props.config.layout
  const hasSide = columns.value.side.length > 0
  const hasRail = columns.value.rail.length > 0

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
    const wide = sideWidth === 'wide'
    if (splitSide === 'right') {
      return wide ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'lg:grid-cols-[minmax(0,1fr)_280px]'
    }
    return wide ? 'lg:grid-cols-[360px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'
  }

  return 'lg:grid-cols-1'
})

/** 信息栏 + 三栏模式下跟随滚动；主内容列不跟随 */
function columnClass(slot: ResumeSlotKey) {
  const sticky = props.config.layout.stickySide && slot !== 'main'

  return sticky ? 'lg:sticky lg:top-20 lg:self-start' : ''
}

/** 主题 → CSS 变量：区块组件只消费变量，不关心明暗 */
const themeVars = computed(() => {
  const { theme } = props.config

  return {
    '--resume-primary': theme.primary,
    '--resume-gradient-from': theme.gradientFrom,
    '--resume-gradient-to': theme.gradientTo,
    '--resume-page': theme.dark ? 'rgb(3 7 18)' : 'rgb(248 250 252)',
    '--resume-surface': theme.dark ? 'rgb(17 24 39)' : 'rgb(255 255 255)',
    '--resume-border': theme.dark ? 'rgb(31 41 55)' : 'rgb(226 232 240)',
    '--resume-text': theme.dark ? 'rgb(229 231 235)' : 'rgb(15 23 42)',
    '--resume-muted': theme.dark ? 'rgb(148 163 184)' : 'rgb(100 116 139)',
    '--resume-chip-bg': theme.dark ? 'rgb(31 41 55)' : 'rgb(241 245 249)',
    '--resume-chip-text': theme.dark ? 'rgb(226 232 240)' : 'rgb(51 65 85)',
  }
})

/**
 * 风格 → CSS 变量（与主题变量**同层**下发，将来容器瘦身也不用另找注入点）。
 *
 * 只放「视觉参数」（圆角 / 内边距 / 表面 / 阴影 / 标题字级）；
 * 结构差异（hero 呈现、外壳标题结构）由 `variant` prop 决定。
 *
 * ⚠️ 取值必须从 `--resume-*` 派生（`color-mix`），**禁止写死品牌色** ——
 * 否则换主题时风格会残留本色，破坏「风格 × 主题」正交（见 docs/dev/resume-styles.md §7）。
 */
const styleVars = computed(() => {
  const { theme } = props.config

  if (props.config.style.id !== 'standard') {
    return {
      '--resume-card-radius': '1rem',
      '--resume-card-padding': '1.25rem',
      '--resume-card-bg': 'var(--resume-surface)',
      '--resume-card-shadow': 'none',
      '--resume-card-shadow-hover': 'none',
      '--resume-title-size': '0.875rem',
    }
  }

  const deep = theme.dark ? 'var(--resume-chip-bg)' : 'var(--resume-chip-bg)'

  return {
    '--resume-card-radius': '1.5rem',
    '--resume-card-padding': '1.5rem',
    // 卡片表面：两处主色光斑 + 表面色渐变，全部由主题变量派生
    '--resume-card-bg': [
      'radial-gradient(circle at top left, color-mix(in srgb, var(--resume-primary) 10%, transparent), transparent 34%)',
      'radial-gradient(circle at bottom right, color-mix(in srgb, var(--resume-primary) 6%, transparent), transparent 28%)',
      `linear-gradient(180deg, color-mix(in srgb, var(--resume-surface) 88%, transparent), color-mix(in srgb, ${deep} 60%, var(--resume-surface)))`,
    ].join(', '),
    '--resume-card-shadow': '0 16px 40px color-mix(in srgb, var(--resume-text) 7%, transparent)',
    '--resume-card-shadow-hover': '0 20px 44px color-mix(in srgb, var(--resume-primary) 18%, transparent)',
    '--resume-title-size': '1.5rem',
  }
})

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
    :style="{ ...themeVars, ...styleVars, background: 'var(--resume-page)' }"
  >
    <ResumeBackgroundLayer :background="config.background" :dark="config.theme.dark" />

    <div
      class="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6"
      :class="gridClass"
    >
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
