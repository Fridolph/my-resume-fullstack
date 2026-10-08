<script lang="ts" setup>
import type { ComponentPublicInstance } from "vue";
import { useEventListener, useMounted } from "@vueuse/core";
import { moveArrayElement, useSortable } from "@vueuse/integrations/useSortable";

/**
 * 拖拽事件类型。
 *
 * 从 `moveArrayElement` 的参数推导，而不是直接 `import type ... from 'sortablejs'`：
 * app 没有声明 `@types/sortablejs`，直接 import 会报 TS7016；
 * 走 vueuse 的声明则能解析到提升目录里的类型。
 */
type SortableEvent = NonNullable<Parameters<typeof moveArrayElement>[3]>;

type ScrollAreaExposed = ComponentPublicInstance & { $el: HTMLElement };

/**
 * SortableBar —— 横向可拖拽排序的选项条（参考 greensketch design/OptionBar，解耦业务）。
 *
 * - 响应式：横向滚动 + 溢出时的左右滚动按钮 + ResizeObserver 自适应
 * - 交互：拖拽排序（本地即时生效）、点击选中（`activeId`）
 * - 主题：`theme` 为 `dark`（默认）/ `light`，通过 `--sb-*` CSS 变量切换，可外部接 `useColorMode` 随系统
 */
const props = withDefaults(
  defineProps<{
    /** dark（默认）/ light；可接 useColorMode 随系统主题 */
    theme?: "dark" | "light";
    /** 左右滚动按钮每次滚动的像素 */
    scrollStep?: number;
    /** 每一项的估算宽度（用于点击时滚动定位） */
    itemWidth?: number;
  }>(),
  {
    theme: "dark",
    scrollStep: 200,
    itemWidth: 100,
  },
);

const items = defineModel<Record<string, any>[]>("modelValue", { required: true });
const activeId = defineModel<string | number | null>("activeId", { default: null });

const emit = defineEmits<{ "item-click": [item: Record<string, any>, index: number] }>();

const isMounted = useMounted();
const scrollAreaRef = useTemplateRef<ScrollAreaExposed>("scrollAreaRef");
const showScrollButtons = ref(false);
const isScrolledToStart = ref(true);
const isScrolledToEnd = ref(false);

function getScrollEl(): HTMLElement | undefined {
  const el = scrollAreaRef.value?.$el;
  return el instanceof HTMLElement ? el : undefined;
}

function scrollToItem(index: number) {
  getScrollEl()?.scrollTo({ top: 0, left: index * props.itemWidth, behavior: "smooth" });
}

function getViewportEl(): HTMLElement | undefined {
  const root = getScrollEl();
  if (!root) {
    return undefined;
  }
  const viewport = root.querySelector('[data-slot="viewport"]');
  return viewport instanceof HTMLElement ? viewport : undefined;
}

function checkScrollPosition() {
  const el = getScrollEl();
  if (!el) {
    return;
  }
  const { scrollLeft, scrollWidth, clientWidth } = el;
  isScrolledToStart.value = scrollLeft <= 0;
  isScrolledToEnd.value = scrollLeft >= scrollWidth - clientWidth - 1;
}

function checkIfScrollButtonsNeeded() {
  const el = getScrollEl();
  if (!el) {
    return;
  }
  showScrollButtons.value = el.scrollWidth > el.clientWidth + 1;
}

function updateScrollState() {
  checkIfScrollButtonsNeeded();
  checkScrollPosition();
}

function scrollTabsLeft() {
  getScrollEl()?.scrollBy({ left: -props.scrollStep, behavior: "smooth" });
}

function scrollTabsRight() {
  getScrollEl()?.scrollBy({ left: props.scrollStep, behavior: "smooth" });
}

let removeScrollListener: (() => void) | undefined;
let resizeObserver: ResizeObserver | undefined;

const { start, stop } = useSortable(() => getViewportEl() ?? null, items, {
  watchElement: false,
  handle: ".option-drag-handle",
  direction: "horizontal",
  animation: 220,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  ghostClass: "option-sort-ghost",
  chosenClass: "option-sort-chosen",
  dragClass: "option-sort-drag",
  fallbackClass: "option-sort-fallback",
  forceFallback: true,
  fallbackOnBody: true,
  fallbackTolerance: 0,
  emptyInsertThreshold: 24,
  scroll: true,
  bubbleScroll: true,
  filter: "input, textarea, select, option",
  onStart: () => {
    if (import.meta.client) {
      document.body.classList.add("option-sort-active");
    }
  },
  onEnd: () => {
    if (import.meta.client) {
      document.body.classList.remove("option-sort-active");
    }
  },
  onUpdate: (e: SortableEvent) => {
    moveArrayElement(items, e.oldIndex ?? 0, e.newIndex ?? 0, e);
    nextTick(updateScrollState);
  },
} as any);

async function restartSortable() {
  stop();
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  start();
}

watch(
  [isMounted, () => items.value.length],
  async ([mounted, count]) => {
    if (!mounted) {
      stop();
      return;
    }
    if (count > 0) {
      await restartSortable();
      await nextTick();
      updateScrollState();
    } else {
      stop();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await nextTick();
  const el = getScrollEl();
  if (!el) {
    return;
  }

  el.addEventListener("scroll", checkScrollPosition, { passive: true });
  removeScrollListener = () => el.removeEventListener("scroll", checkScrollPosition);

  resizeObserver = new ResizeObserver(updateScrollState);
  resizeObserver.observe(el);
  const viewport = getViewportEl();
  if (viewport) {
    resizeObserver.observe(viewport);
  }
  updateScrollState();
});

onUnmounted(() => {
  removeScrollListener?.();
  resizeObserver?.disconnect();
  stop();
});

useEventListener("resize", updateScrollState);

function handleItemClick(item: Record<string, any>, index: number) {
  activeId.value = item.id;
  emit("item-click", item, index);
  scrollToItem(index);
}
</script>

<template>
  <div class="sortable-bar flex h-12 items-center" :data-theme="theme">
    <div
      v-if="showScrollButtons"
      class="flex h-full shrink-0 items-center justify-center border-r border-[var(--sb-border)] px-1"
      :class="{ hidden: isScrolledToStart }"
    >
      <UButton
        icon="i-lucide-arrow-left"
        variant="link"
        color="neutral"
        :ui="{ base: 'hover:bg-white/10', leadingIcon: 'size-5 text-[var(--sb-fg)]' }"
        @click="scrollTabsLeft"
      />
    </div>

    <UScrollArea
      ref="scrollAreaRef"
      orientation="horizontal"
      :ui="{
        root: 'scrollbar-hidden h-full flex-1 min-w-0',
        viewport: 'h-full',
      }"
    >
      <slot :items="items" :active-id="activeId">
        <SortableBarItem
          v-for="(item, idx) in items"
          :key="item.id"
          :item="item"
          :index="idx"
          :theme="theme"
          :active="String(activeId) === String(item.id)"
          @select="handleItemClick(item, idx)"
        >
          <template v-if="$slots.actions" #actions="{ item: slotItem }">
            <slot name="actions" :item="slotItem" />
          </template>
        </SortableBarItem>
      </slot>
    </UScrollArea>

    <div
      v-if="showScrollButtons"
      class="flex h-full shrink-0 items-center justify-center border-x border-[var(--sb-border)] px-1"
      :class="{ hidden: isScrolledToEnd }"
    >
      <UButton
        icon="i-lucide-arrow-right"
        variant="link"
        color="neutral"
        :ui="{ base: 'hover:bg-white/10', leadingIcon: 'size-5 text-[var(--sb-fg)]' }"
        @click="scrollTabsRight"
      />
    </div>

    <div class="flex h-full shrink-0 items-center gap-x-2 px-2">
      <slot name="extra" :count="items.length" />
    </div>
  </div>
</template>

<style scoped>
/* 主题变量：dark（默认）/ light。子组件通过继承拿到 --sb-* */
.sortable-bar[data-theme="dark"] {
  --sb-bg: #18191b;
  --sb-border: rgb(255 255 255 / 0.12);
  --sb-fg: #fff;
  --sb-fg-muted: rgb(255 255 255 / 0.64);
  --sb-active-bg: #666e7a;
  --sb-hover-bg: #3d3d3d;
}

.sortable-bar[data-theme="light"] {
  --sb-bg: #f7f7f7;
  --sb-border: rgb(0 0 0 / 0.08);
  --sb-fg: #18191b;
  --sb-fg-muted: rgb(0 0 0 / 0.55);
  --sb-active-bg: #e2e6ec;
  --sb-hover-bg: #eff0f0;
}

.sortable-bar {
  background: var(--sb-bg);
}

:global(.option-sort-ghost) {
  opacity: 1 !important;
  min-width: 7.5rem;
  height: 100% !important;
  border: 2px dashed #3ec064 !important;
  background: color-mix(in srgb, #3ec064 12%, transparent) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #3ec064 25%, transparent);
}

:global(.option-sort-ghost) * {
  visibility: hidden;
}

:global(.option-sort-chosen) {
  opacity: 0.35 !important;
  border-style: dashed !important;
  border-color: rgb(148 163 184 / 0.6) !important;
  transition: opacity 0.15s ease;
}

:global(.option-sort-fallback),
:global(.option-sort-drag) {
  opacity: 1 !important;
  cursor: grabbing !important;
  pointer-events: none !important;
  transition: none !important;
  will-change: transform;
  border: 2px solid #3ec064 !important;
  box-shadow:
    0 8px 20px rgb(0 57 103 / 22%),
    0 0 0 3px color-mix(in srgb, #3ec064 18%, transparent) !important;
  z-index: 9999 !important;
}

:global(.option-sort-fallback *),
:global(.option-sort-drag *) {
  transition: none !important;
}

:global(body.option-sort-active) {
  cursor: grabbing !important;
  user-select: none;
}

:global(body.option-sort-active .option-drag-handle) {
  cursor: grabbing !important;
}
</style>
