<script setup lang="ts">
import { computed } from 'vue'

/**
 * 编辑面板（右栏外壳）：标题行 + 卡片，内容由调用方给。
 *
 * ## 为什么去掉了折叠
 *
 * 早先它是手风琴（每个模块一张可折叠卡）。Owner 要求改成布局编辑器那种交互：
 * **左侧列表负责选模块与排序，右侧只显示当前选中的那一个** ——
 * 于是"折叠"就没有意义了（一屏只有一个模块，本来不需要收）。
 *
 * ⚠️ 保留这段说明是因为折叠踩过两个坑，别在别处重犯：
 * 1. 标题栏**不要**自己写 `@click` 去 toggle：`UCollapsible` 的默认插槽会被 Reka 包成
 *    `CollapsibleTrigger`，整张卡片点击它自己就会 toggle；再加一个 `@click` 会**一次点两次**、
 *    净效果为零（实测日志：一次点击触发两回 `setSectionOpen`）；
 * 2. 收起的显隐别用 Tailwind 的 `group-*` 变体：v4 会把 `pointer-events: none`
 *    泄漏到承载 `group` 的元素上，整张卡片点不动。
 */
const props = defineProps<{
  label: string
  icon?: string
  /** 类型标签（如 `custom`），便于排查数据 */
  type?: string
}>()

const iconName = computed(() => props.icon ?? 'i-lucide-file-text')
</script>

<template>
  <UCard data-testid="resume-module-editor" :ui="{ body: 'p-5 sm:p-5', header: 'p-3 sm:px-4' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon :name="iconName" class="size-4 shrink-0 text-muted" />
        <h3 class="text-sm font-semibold text-highlighted">{{ label }}</h3>
        <span v-if="type" class="text-xs text-dimmed">{{ type }}</span>
        <div class="ml-auto flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
    </template>

    <slot />
  </UCard>
</template>
