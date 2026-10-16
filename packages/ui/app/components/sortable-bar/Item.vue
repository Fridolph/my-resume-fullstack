<script setup lang="ts">
/**
 * SortableBarItem —— 可排序条里的单条（参考 greensketch design/OptionItem）。
 * 结构：拖拽把手 + 序号徽标 + 名称 + 可选状态 badge + `#actions` 插槽。
 * 颜色走 `--sb-*` CSS 变量（由 SortableBar 按 theme 注入，可继承）。
 */
withDefaults(
  defineProps<{
    item: Record<string, any>
    index?: number
    active?: boolean
    theme?: 'dark' | 'light'
    showHandle?: boolean
  }>(),
  {
    index: 0,
    active: false,
    theme: 'dark',
    showHandle: true,
  },
)

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <div
    class="sortable-bar-item flex h-full shrink-0 items-center gap-x-2 border-r px-2"
    :data-theme="theme"
    :data-option-id="item.id"
    :class="[active ? 'is-active' : '', item.wide ? 'min-w-54' : 'min-w-30']"
    @click="emit('select')"
  >
    <span v-if="showHandle" class="option-drag-handle" aria-hidden="true">
      <UIcon name="i-lucide-grip-vertical" class="size-5" />
    </span>

    <SortableBarBadge
      :label="item.idx ?? index + 1"
      :show-chip="item.quickQuote"
      :active="item.badgeActive !== false"
      :tooltip-text="item.tooltip"
    />

    <div class="min-w-0 flex-1 truncate text-sm">
      <UTooltip :text="item.name" :ui="{ content: 'ring-transparent' }">
        <span class="select-none">{{ item.name }}</span>
      </UTooltip>
    </div>

    <UBadge
      v-if="item.badge"
      variant="soft"
      :label="item.badge.label"
      :ui="{ base: `px-1 py-0 w-fit rounded-sm ${item.badge.class || ''}` }"
    />

    <slot name="actions" :item="item" />
  </div>
</template>

<style scoped>
.sortable-bar-item {
  background: var(--sb-bg, #18191b);
  color: var(--sb-fg-muted, rgb(255 255 255 / 0.64));
  border-color: var(--sb-border, rgb(255 255 255 / 0.1));
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.sortable-bar-item:hover {
  background: var(--sb-hover-bg, #3d3d3d);
}

.sortable-bar-item.is-active {
  background: var(--sb-active-bg, #666e7a);
  color: var(--sb-fg, #fff);
}

.option-drag-handle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0.25rem;
  margin: -0.25rem;
  color: var(--sb-fg-muted, rgb(255 255 255 / 0.5));
  touch-action: none;
  user-select: none;
  cursor: grab !important;
}

.option-drag-handle:hover {
  color: var(--sb-fg, #fff);
}

.option-drag-handle:active,
:global(.option-sort-chosen) .option-drag-handle {
  cursor: grabbing !important;
}

:global(.option-sort-chosen) .option-drag-handle .iconify {
  color: #3ec064;
}

.option-drag-handle :deep(svg),
.option-drag-handle :deep(.iconify) {
  pointer-events: none;
  cursor: inherit;
}
</style>
