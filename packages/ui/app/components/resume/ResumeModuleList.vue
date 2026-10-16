<script setup lang="ts">
import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'

/**
 * 列表项：只取列表真正需要的字段（显示名 / 图标 / 是否锁定）。
 *
 * 刻意**不接收 `ResumeSection`**：那会把整棵区块 data 拖进这个纯展示组件，
 * 也会让"列表只认识顺序与名字"这件事被打破。调用方负责把文档映射成这个形状。
 */
export interface ResumeModuleListItem {
  id: string
  label: string
  icon?: string
  /** 固定项（通常是基本信息）：不可拖走、保持在首位 */
  locked?: boolean
}

/**
 * 拖拽事件类型：从 `moveArrayElement` 的参数推导，避免直接 `import type … from 'sortablejs'`
 * （app 未声明 `@types/sortablejs`，直接 import 会 TS7016）。
 */
type SortableEvent = NonNullable<Parameters<typeof moveArrayElement>[3]>

/**
 * 简历模块列表（可拖拽排序 + 点选）。
 *
 * 布局编辑器那个交互的**左侧部分**：只回答"有哪些模块、什么顺序、哪个被选中"，
 * 不认识任何字段 —— 具体内容由右侧面板渲染。因此 web 与 admin 都能用同一个组件，
 * 两端只需要各自接自己的"保存"动作。
 *
 * ## 为什么排序模型是"完整 id 顺序"而不是"拖过的两项交换"
 *
 * `display.sections.order` 在契约里**必须完整覆盖所有模块**（含隐藏项），
 * 所以这里维护的就是那一条完整数组：拖拽后直接写回模型，不做增量补丁 ——
 * 增量推算容易和契约校验打架（漏一项就保存失败）。
 *
 * ## 固定项
 *
 * `profile`（基本信息）必须是第一个且不可拖走：契约要求恰有一个 profile，
 * 界面上也不该让用户把它拖到别处导致误解。
 */
const props = defineProps<{
  /** 与顺序一一对应的模块清单（含显示名与图标） */
  sections: ResumeModuleListItem[]
  /** 已隐藏的模块 id */
  hidden?: string[]
  /** 当前选中的模块 id */
  selected?: string
}>()

/** 完整顺序（双向）：拖拽会就地改它 */
const order = defineModel<string[]>('order', { required: true })

const emit = defineEmits<{
  select: [id: string]
  toggleHidden: [id: string]
}>()

const listRef = useTemplateRef<HTMLElement>('list')

/** 用顺序查回模块定义（顺序是权威，清单只是查表） */
function sectionOf(id: string): ResumeModuleListItem | undefined {
  return props.sections.find(item => item.id === id)
}

const isHidden = (id: string) => (props.hidden ?? []).includes(id)
const isLocked = (id: string) => sectionOf(id)?.locked === true

/** 锁定项（通常是 profile）保持在首位 */
function ensureLockedFirst() {
  const locked = props.sections.find(item => item.locked)
  if (!locked) return
  const index = order.value.indexOf(locked.id)
  if (index > 0) {
    order.value.splice(index, 1)
    order.value.unshift(locked.id)
  }
}

useSortable(listRef, order, {
  watchElement: true,
  handle: '[data-drag-handle]',
  animation: 150,
  ghostClass: 'opacity-40',
  onEnd(event: SortableEvent) {
    ensureLockedFirst()
    // 拖拽就地改的是 `order`；这里显式再赋一次，确保父级拿到的是**新数组引用**
    // （父级若把它写回文档字段，靠引用变化触发保存）
    order.value = [...order.value]
    void event
  },
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <div
      v-for="id in order"
      :key="id"
      class="group flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm transition-colors"
      :class="
        selected === id
          ? 'border-primary/40 bg-primary/5 text-highlighted'
          : 'border-transparent hover:bg-elevated text-default'
      "
      :data-section-id="id"
    >
      <!-- 拖拽把手：只有它有 `data-drag-handle`，`useSortable` 的 handle 指向它 -->
      <button
        type="button"
        data-drag-handle
        class="cursor-grab rounded p-0.5 text-dimmed hover:text-default active:cursor-grabbing"
        :disabled="isLocked(id)"
        :aria-label="`拖拽调整「${sectionOf(id)?.label ?? id}」的顺序`"
      >
        <UIcon name="i-lucide-grip-vertical" class="size-4" />
      </button>

      <!-- 点整行 = 选中该模块，右侧显示它的编辑面板 -->
      <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" @click="emit('select', id)">
        <UIcon :name="sectionOf(id)?.icon ?? 'i-lucide-file-text'" class="size-4 shrink-0 text-muted" />
        <span class="truncate" :class="isHidden(id) ? 'text-dimmed line-through' : ''">
          {{ sectionOf(id)?.label ?? id }}
        </span>
        <UIcon v-if="isLocked(id)" name="i-lucide-lock" class="size-3 shrink-0 text-dimmed" />
      </button>

      <!-- 显隐：隐藏的模块仍参与 order（契约要求），只是不进页面 -->
      <UButton
        :icon="isHidden(id) ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        size="xs"
        color="neutral"
        variant="ghost"
        :aria-label="isHidden(id) ? `显示「${sectionOf(id)?.label ?? id}」` : `隐藏「${sectionOf(id)?.label ?? id}」`"
        @click="emit('toggleHidden', id)"
      />
    </div>
  </div>
</template>
