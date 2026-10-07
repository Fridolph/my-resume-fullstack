<script setup lang="ts">
import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'

/**
 * 拖拽事件类型。
 *
 * 从 `moveArrayElement` 的参数推导，而不是直接 `import type ... from 'sortablejs'`：
 * app 没有声明 `@types/sortablejs`，直接 import 会报 TS7016；
 * 走 vueuse 的声明则能解析到提升目录里的类型。
 */
type SortableEvent = NonNullable<Parameters<typeof moveArrayElement>[3]>
import type { ResumeSection } from '~/composables/useResumeLayout'

/**
 * ResumeLayoutPanel —— 模块排序 + 显隐 + 配置入口的面板（参考 greensketch PageLayoutPanel）。
 *
 * - 垂直拖拽排序（SortableJS，`useSortable`）
 * - 每行：锁定/拖拽把手 + 名称 + 配置图标（actionKey）+ 显隐眼睛
 * - 子模块递归渲染（ResumeLayoutChildItem）
 * - `isDirty` 时显示 Save / Reset
 */
const props = defineProps<{
  sections: ResumeSection[]
  getSwitch: (key?: string) => number
  isDirty: boolean
  width: number
}>()

const order = defineModel<string[]>('order', { required: true })

const emit = defineEmits<{
  save: []
  reset: []
  toggle: [key: string]
  action: [key: string]
  'scroll-to': [id: string]
}>()

const listRef = useTemplateRef<HTMLElement>('list')

/** 第一个模块（locked）固定在位置 0，不能被拖走，其它模块也不能插到它前面 */
const firstModuleId = computed(() => props.sections[0]?.id)

function ensureFirstLocked() {
  const first = firstModuleId.value
  if (!first) return
  const isLocked = props.sections.find(s => s.id === first)?.locked
  if (!isLocked) return
  const idx = order.value.indexOf(first)
  if (idx > 0) {
    order.value.splice(idx, 1)
    order.value.unshift(first)
  }
}

const { start } = useSortable(listRef, order, {
  watchElement: true,
  handle: '.layout-drag-handle',
  animation: 150,
  ghostClass: 'layout-sort-ghost',
  chosenClass: 'layout-sort-chosen',
  forceFallback: true,
  fallbackOnBody: true,
  fallbackTolerance: 3,
  filter: 'input, textarea, select, option',
  onUpdate: (e: SortableEvent) => {
    moveArrayElement(order, e.oldIndex ?? 0, e.newIndex ?? 0, e)
    ensureFirstLocked()
  },
} as any)

onMounted(async () => {
  await nextTick()
  start()
})

const sectionMap = computed<Record<string, ResumeSection>>(() =>
  props.sections.reduce((acc, s) => {
    acc[s.id] = s
    return acc
  }, {} as Record<string, ResumeSection>),
)

function moduleVisible(id: string) {
  const s = sectionMap.value[id]
  return s?.switchKey ? !!props.getSwitch(s.switchKey) : true
}

function toggleModule(id: string) {
  const s = sectionMap.value[id]
  if (!s?.switchKey) return
  emit('toggle', s.switchKey)
}

function onScrollTo(id: string) {
  if (!moduleVisible(id)) return
  emit('scroll-to', id)
}
</script>

<template>
  <aside class="flex h-full flex-col bg-default" :style="{ width: `${width}px` }">
    <div class="shrink-0 border-b border-default px-4 pb-2 pt-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-highlighted">布局</h3>
        <UTooltip text="拖拽排序模块；点击名称定位到预览；眼睛控制显隐">
          <UIcon name="i-lucide-info" class="size-4 text-muted" />
        </UTooltip>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <div ref="list" class="min-h-0 flex-1 overflow-y-auto p-2">
        <div v-for="moduleId in order" :key="moduleId">
          <div class="my-0.5 border-t border-default" />

          <div
            class="group flex h-10 items-center gap-2 rounded-md px-2 hover:bg-primary/8 hover:text-primary"
            @click.self="onScrollTo(moduleId)"
          >
            <!-- 锁定：不可拖 -->
            <UIcon
              v-if="sectionMap[moduleId]?.locked"
              name="i-lucide-lock"
              class="size-4 shrink-0 text-muted"
            />
            <!-- 可拖：把手 -->
            <span v-else class="layout-drag-handle" aria-hidden="true">
              <UIcon name="i-lucide-grip-vertical" class="size-4" />
            </span>

            <span
              class="min-w-0 flex-1 cursor-pointer truncate text-sm"
              @click="onScrollTo(moduleId)"
            >
              {{ sectionMap[moduleId]?.label ?? moduleId }}
            </span>

            <UButton
              v-if="sectionMap[moduleId]?.actionKey"
              icon="i-lucide-settings-2"
              variant="link"
              color="primary"
              size="xs"
              class="opacity-0 group-hover:opacity-100"
              @click.stop="emit('action', sectionMap[moduleId]!.actionKey!)"
            />

            <UButton
              :icon="moduleVisible(moduleId) ? 'i-lucide-eye' : 'i-lucide-eye-off'"
              variant="link"
              color="primary"
              size="xs"
              @click="toggleModule(moduleId)"
            />
          </div>

          <template v-for="child in sectionMap[moduleId]?.children ?? []" :key="child.id">
            <ResumeLayoutChildItem
              :child="child"
              :depth="1"
              :get-switch="getSwitch"
              @toggle="emit('toggle', $event)"
              @action="emit('action', $event)"
            />
          </template>
        </div>
      </div>

      <div
        v-if="isDirty"
        class="flex shrink-0 items-center gap-2 border-t border-default bg-default px-4 py-3"
      >
        <UButton label="取消" color="neutral" variant="outline" size="sm" class="flex-1" @click="emit('reset')" />
        <UButton label="保存" size="sm" class="flex-1" @click="emit('save')" />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.layout-drag-handle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0.25rem;
  margin: -0.25rem;
  color: var(--ui-text-dimmed, #71717a);
  touch-action: none;
  user-select: none;
  cursor: grab !important;
}

.layout-drag-handle:active,
:global(.layout-sort-chosen) .layout-drag-handle {
  cursor: grabbing !important;
}

.layout-drag-handle :deep(svg) {
  pointer-events: none;
}

:global(.layout-sort-ghost) {
  opacity: 0.5;
  border-radius: 0.375rem;
  background-color: var(--ui-bg-muted, #f4f4f5);
}
</style>
