<script setup lang="ts">
import type { ColumnDraftItem } from '~/types/column-sort'
import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'

/**
 * 拖拽事件类型。
 *
 * 从 `moveArrayElement` 的参数推导，而不是直接 `import type ... from 'sortablejs'`：
 * app 没有声明 `@types/sortablejs`，直接 import 会报 TS7016；
 * 走 vueuse 的声明则能解析到提升目录里的类型。
 */
type SortableEvent = NonNullable<Parameters<typeof moveArrayElement>[3]>

/**
 * ColumnSortList —— 可拖拽排序 + 显隐勾选的列表（参考 greensketch 同名组件）。
 * `v-model` 绑定 `ColumnDraftItem[]`，拖拽后数组顺序同步更新。
 */
const items = defineModel<ColumnDraftItem[]>({ required: true })

const listRef = useTemplateRef<HTMLElement>('list')

const { start } = useSortable(listRef, items, {
  watchElement: true,
  handle: '.drag-handle',
  animation: 150,
  ghostClass: 'column-sort-ghost',
  forceFallback: true,
  fallbackOnBody: true,
  fallbackTolerance: 3,
  filter: 'input, textarea, select, option',
  onUpdate: (e: SortableEvent) => {
    moveArrayElement(items, e.oldIndex ?? 0, e.newIndex ?? 0, e)
  },
} as any)

onMounted(async () => {
  await nextTick()
  start()
})
</script>

<template>
  <div ref="list" class="divide-y divide-default">
    <div v-for="item in items" :key="item.key" class="column-sort-item flex items-center gap-3 py-3">
      <span class="drag-handle" aria-hidden="true">
        <UIcon name="i-lucide-grip-vertical" class="size-4" />
      </span>
      <UCheckbox v-model="item.visible" :label="item.label" />
    </div>
  </div>
</template>

<style scoped>
.drag-handle {
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

.drag-handle:active,
.column-sort-item.sortable-chosen .drag-handle {
  cursor: grabbing !important;
}

.drag-handle :deep(svg),
.drag-handle :deep(.iconify) {
  pointer-events: none;
  cursor: inherit;
}

:global(.column-sort-ghost),
:global(.sortable-fallback) {
  cursor: grabbing !important;
}

:global(.column-sort-ghost) {
  opacity: 0.5;
  background-color: var(--ui-bg-muted, #f4f4f5);
}
</style>
