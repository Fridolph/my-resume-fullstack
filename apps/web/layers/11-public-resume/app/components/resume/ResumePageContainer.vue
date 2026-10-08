<script setup lang="ts">
import type Sortable from 'sortablejs'
import type { SortableEvent } from 'sortablejs'
import type {
  ResumeContent,
  ResumeDisplayConfig,
  ResumeDropTarget,
  ResumeSectionKey,
  ResumeSlotKey,
} from '#layers/public-resume/app/types/resume'
import { getSectionDefinition, resumeSectionDefinitions } from '#layers/public-resume/app/config/resume-sections'
import { useResumeActiveSection } from '#layers/public-resume/app/composables/useResumeActiveSection'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeBackgroundLayer from './ResumeBackgroundLayer.vue'
import ResumeColumn from './ResumeColumn.vue'
import ResumeSectionTray from './ResumeSectionTray.vue'

/**
 * 正文容器：布局与拖拽的唯一实现处。
 *
 * - 把区块按「配置顺序 + 栏位归属」分到各栏；三种布局共用同一份 order / slot
 * - 把 `style.id` 作为 `variant` 往下传（结构差异用），并输出 `data-resume-style` 供样式选择
 * - 编辑态：**空栏也渲染落点**（否则清空一栏就再也拖不回去）、跨栏拖拽、进出托盘、
 *   栏内上移/下移；拖拽落点用**渲染数据**算，不读 DOM 兄弟节点
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

const { applyDrop, moveWithin } = useResumeDisplay()
const { observe, stop: stopActiveSection } = useResumeActiveSection()
const containerRef = useTemplateRef<HTMLElement>('containerRef')

/** 拖拽进行中：用于给所有可落区域描边（见 resume.css） */
const dragging = ref(false)

/** 三个栏位的固定 DOM 顺序（移动端单列时也按这个顺序阅读） */
const SLOT_ORDER: ResumeSlotKey[] = ['side', 'main', 'rail']

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

/** 当前布局下**有效**的栏位：single 只有 main，split 没有 rail（rail 并入 main） */
const activeSlots = computed<ResumeSlotKey[]>(() => {
  const mode = props.config.layout.mode
  if (mode === 'threeColumn') {
    return ['side', 'main', 'rail']
  }
  if (mode === 'split') {
    return ['side', 'main']
  }
  return ['main']
})

/** 托盘里的模块（编辑态） */
const trayKeys = computed(() =>
  props.config.sections.hidden.filter((key) => getSectionDefinition(key)),
)

/**
 * 是否渲染某一栏。
 *
 * 非编辑态：空栏不渲染（布局自然塌陷，与公开站一致）；
 * 编辑态：**有效**栏位即使为空也渲染，作为可落区域。
 */
function showsSlot(slot: ResumeSlotKey) {
  return columns.value[slot].length > 0
    || (props.editable === true && activeSlots.value.includes(slot))
}

/**
 * 栅格类必须是**字面量**：Tailwind 扫描源码里的静态字符串，
 * 拼接出来的类名不会生成样式。
 *
 * split 的两档宽度对齐旧站（旧站固定 `lg:320px / xl:360px`）：
 * `compact` ≈ 旧站观感，`wide` 再各宽一档。
 */
const gridClass = computed(() => {
  const { mode, splitSide, sideWidth } = props.config.layout
  const hasSide = showsSlot('side')
  const hasRail = showsSlot('rail')
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

/** 用 data-slot 定位落点容器（三个栏位 + 托盘） */
function dropElement(target: ResumeDropTarget) {
  return containerRef.value?.querySelector<HTMLElement>(`[data-slot="${target}"]`) ?? null
}

/**
 * 算落点锚：**用渲染数据，不读 DOM**。
 *
 * 拖拽期间配置不变，所以「目标容器去掉自身后的数组」里第 `newIndex` 项，
 * 就是落点之后的那一项（`undefined` = 落末尾）。同栏排序与跨栏拖拽是同一套算法。
 * （旧实现读 `item.nextElementSibling`，而 sortablejs 已经改过 DOM、Vue 随后又要重排，
 * 属于"两个人改同一块 DOM"，容易错位。）
 */
function resolveAnchor(key: ResumeSectionKey, to: ResumeDropTarget, evt: SortableEvent) {
  const list = (to === 'tray' ? trayKeys.value : columns.value[to]).filter((item) => item !== key)
  return list[evt.newIndex ?? list.length]
}

async function initSortables() {
  destroySortables()
  if (!import.meta.client || !props.editable) {
    return
  }

  const SortableCtor = (await import('sortablejs')).default

  for (const target of [...activeSlots.value, 'tray' as ResumeDropTarget]) {
    const el = dropElement(target)
    if (!el) {
      continue
    }

    instances.push(
      SortableCtor.create(el, {
        group: 'resume-sections',
        handle: '[data-drag-handle]',
        animation: 150,
        // 不用 HTML5 drag-and-drop：它无法被自动化鼠标事件驱动，且触屏不支持；
        // fallback 模式在鼠标 / 触屏 / 自动化下行为一致（admin 的拖拽也是这么配的）
        forceFallback: true,
        fallbackOnBody: true,
        fallbackTolerance: 3,
        // 空容器判定范围放宽：默认值很小，空栏（只有占位框）几乎拖不中 —— 本轮实测出来的问题
        emptyInsertThreshold: 24,
        ghostClass: 'resume-drag-ghost',
        chosenClass: 'resume-drag-chosen',
        onStart() {
          dragging.value = true
        },
        onEnd(evt: SortableEvent) {
          dragging.value = false

          const item = evt.item as HTMLElement
          const key = item.dataset.sectionKey as ResumeSectionKey | undefined
          if (!key) {
            return
          }

          const to = ((evt.to as HTMLElement).dataset.slot ?? target) as ResumeDropTarget
          applyDrop({ key, to, anchorKey: resolveAnchor(key, to, evt) })
        },
      }),
    )
  }
}

/** 栏内上移 / 下移：与拖拽共用同一份分栏结果 */
function handleMove(slot: ResumeSlotKey, key: ResumeSectionKey, delta: number) {
  moveWithin(columns.value[slot], key, delta)
}

/** 托盘「点回」：恢复到注册表默认栏位；该栏在当前布局下无效时落到 main */
function handleRestore(key: ResumeSectionKey) {
  const preferred = getSectionDefinition(key)?.defaultSlot ?? 'main'
  applyDrop({ key, to: activeSlots.value.includes(preferred) ? preferred : 'main' })
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

/**
 * 编辑态 / 布局模式 / 栏位有效性变化后重建实例。
 *
 * 编辑态下所有有效栏（含空栏）与托盘都常驻渲染，所以「模块在栏间移动」「某栏被清空/填充」
 * 都不需要重建 —— 只有 `layout.mode` 变化会改变有效栏位集合。
 */
watch(
  () => [props.editable, props.config.layout.mode],
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
    :data-dragging="dragging ? 'true' : undefined"
    :style="{ background: 'var(--resume-page)' }"
  >
    <ResumeBackgroundLayer :background="config.background" :dark="config.theme.dark" />

    <div class="content-max relative grid grid-cols-1 gap-6 px-4 sm:px-6" :class="gridClass">
      <template v-for="slot in SLOT_ORDER" :key="slot">
        <div v-if="showsSlot(slot)" :class="columnClass(slot)">
          <ResumeColumn
            :slot-key="slot"
            :keys="columns[slot]"
            :content="content"
            :options="config.options"
            :theme="config.theme"
            :variant="config.style.id"
            :editable="editable"
            @hide="emit('hide', $event)"
            @edit="emit('edit', $event)"
            @move="(key, delta) => handleMove(slot, key, delta)"
          />
        </div>
      </template>
    </div>

    <!-- 未使用模块托盘：编辑态才有意义 -->
    <div v-if="editable" class="content-max mt-6 px-4 sm:px-6">
      <ResumeSectionTray :keys="trayKeys" @restore="handleRestore" />
    </div>
  </div>
</template>
