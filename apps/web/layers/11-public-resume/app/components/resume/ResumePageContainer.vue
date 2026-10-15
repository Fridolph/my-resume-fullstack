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
import { RESUME_SLOT_ORDER as SLOT_ORDER, useResumeLayout } from '#layers/ui/app/composables/useResumeLayout'
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

/**
 * 排布计算（区块分栏 / 有效栏位 / 栅格与栏位类名）已抽到 `packages/ui` 的 `useResumeLayout`：
 * 它是**纯读**逻辑，公开站、草稿工作台与 admin 的只读详情页都要用；
 * 而本组件剩下的是**编辑交互**（拖拽 / 托盘 / 上移下移），依赖 sortablejs，留在 web。
 */
const { columns, showsSlot, gridClass, columnClass, trayKeys, activeSlots } = useResumeLayout(
  () => props.config,
  () => props.editable === true,
)
// ── 拖拽（仅客户端、仅编辑态）──────────────────────────
let instances: Sortable[] = []

function destroySortables() {
  instances.forEach(instance => instance.destroy())
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
  const list = (to === 'tray' ? trayKeys.value : columns.value[to]).filter(item => item !== key)
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
    <ResumeBackgroundLayer :background="config.background" :dark="config.theme.mode === 'dark'" />

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
