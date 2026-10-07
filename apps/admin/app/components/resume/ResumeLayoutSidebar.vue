<script setup lang="ts">
import { useEventListener, useDebounceFn } from '@vueuse/core'

/**
 * ResumeLayoutSidebar —— 图标条 + 可拖宽面板（参考 greensketch proposal/layout/ProposalSidebar）。
 *
 * - 左侧常驻图标条：顶部 toggle 按钮 + 每个 panel 一个图标
 * - 右侧可展开面板：宽度可拖拽调整（240~480px），通过命名插槽渲染各 panel 内容
 * - `collapseBelow`：窗口窄于阈值时初始收起，缩小窗口也自动收起（不会自动展开）
 */
export interface SidebarPanel {
  id: string
  icon: string
  activeIcon?: string
}

const props = withDefaults(defineProps<{
  panels: SidebarPanel[]
  collapseBelow?: number
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
}>(), {
  collapseBelow: undefined,
  minWidth: 240,
  maxWidth: 480,
  defaultWidth: 320,
})

const emit = defineEmits<{
  'panel-state-change': [expanded: boolean]
  'panel-width-change': [width: number]
}>()

const activePanelId = ref<string | null>(null)
const lastPanelId = ref<string | null>(null)

function initPanelState() {
  const defaultId = props.panels[0]?.id ?? null
  activePanelId.value = (props.collapseBelow && window.innerWidth < props.collapseBelow) ? null : defaultId
}

const debouncedCheckCollapse = useDebounceFn(() => {
  if (props.collapseBelow && window.innerWidth < props.collapseBelow) {
    activePanelId.value = null
  }
}, 500)

onMounted(() => {
  initPanelState()
  if (props.collapseBelow) {
    window.addEventListener('resize', debouncedCheckCollapse)
  }
})

onUnmounted(() => {
  if (props.collapseBelow) {
    window.removeEventListener('resize', debouncedCheckCollapse)
  }
})

watch(activePanelId, val => emit('panel-state-change', !!val), { immediate: true })

function collapse() {
  if (activePanelId.value) lastPanelId.value = activePanelId.value
  activePanelId.value = null
}

function togglePanel(id: string) {
  lastPanelId.value = id
  activePanelId.value = activePanelId.value === id ? null : id
}

function toggle() {
  if (activePanelId.value) {
    lastPanelId.value = activePanelId.value
    activePanelId.value = null
  }
  else {
    activePanelId.value = lastPanelId.value ?? props.panels[0]?.id ?? null
  }
}

function open(id: string) {
  lastPanelId.value = id
  activePanelId.value = id
}

// 面板宽度拖拽调整
const MIN_WIDTH = props.minWidth
const MAX_WIDTH = props.maxWidth
const panelWidth = ref(props.defaultWidth)

const isResizing = ref(false)
let resizeStartX = 0
let resizeStartWidth = 0

function startResize(e: MouseEvent) {
  isResizing.value = true
  resizeStartX = e.clientX
  resizeStartWidth = panelWidth.value
}

useEventListener(window, 'mousemove', (e: MouseEvent) => {
  if (!isResizing.value) return
  const delta = e.clientX - resizeStartX
  panelWidth.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartWidth + delta))
})

useEventListener(window, 'mouseup', () => {
  isResizing.value = false
})

watch(panelWidth, val => emit('panel-width-change', val), { immediate: true })

defineExpose({ toggle, collapse, open })
</script>

<template>
  <div class="flex h-full">
    <!-- 图标条 -->
    <aside class="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-default bg-default pt-1">
      <UButton
        :icon="activePanelId ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left'"
        variant="ghost"
        color="neutral"
        size="sm"
        square
        class="size-9"
        @click="toggle"
      />
      <UButton
        v-for="panel in panels"
        :key="panel.id"
        :icon="(activePanelId === panel.id && panel.activeIcon) ? panel.activeIcon : panel.icon"
        variant="ghost"
        :color="activePanelId === panel.id ? 'primary' : 'neutral'"
        size="sm"
        square
        class="size-9"
        @click="togglePanel(panel.id)"
      />
    </aside>

    <!-- 可展开面板 -->
    <aside
      v-if="activePanelId"
      class="relative h-full shrink-0 overflow-hidden border-r border-default bg-default"
      :style="{ width: `${panelWidth}px` }"
    >
      <!-- 拖宽把手 -->
      <div class="resize-handle" @mousedown.prevent="startResize">
        <div class="resize-handle__bar" />
      </div>

      <slot :name="activePanelId" :collapse="collapse" :width="panelWidth" />
    </aside>
  </div>
</template>

<style scoped>
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 16px;
  transform: translateX(50%);
  cursor: col-resize;
  z-index: 10;
}

.resize-handle__bar {
  position: absolute;
  right: 6px;
  top: 50%;
  width: 5px;
  height: 64px;
  border-radius: 2px;
  background-color: var(--ui-primary, #3ec064);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}

.resize-handle:hover .resize-handle__bar,
.resize-handle:active .resize-handle__bar {
  opacity: 1;
}
</style>
