<script setup lang="ts">
import type { Resume } from '~/config/resume-demo'
import { RESUME_STATUS_META } from '~/config/resume-demo'

/**
 * ResumeOptionsTab —— 多份简历的标签页（参考 greensketch ProposalOptionsTab）。
 *
 * - 横向滚动 + 溢出时的左右滚动按钮 + ResizeObserver 自适应
 * - 每个 tab：序号 + 名称 + 状态徽标 + 更新时间
 * - 右侧「对比」按钮：options > 1 时显示，emit compare
 * - 移动端不单独做下拉选择（greensketch 有，这里简化为统一横向滚动）
 */
const props = withDefaults(
  defineProps<{
    options: Resume[]
    /** 每个 tab 的估算宽度，用于点击时滚动定位 */
    itemWidth?: number
    scrollStep?: number
  }>(),
  {
    itemWidth: 160,
    scrollStep: 200,
  },
)

const activeId = defineModel<number | null>('activeId', { default: null })

const emit = defineEmits<{
  'option-change': [id: number]
  compare: []
}>()

const scrollAreaRef = useTemplateRef<{ $el: HTMLElement }>('scrollAreaRef')
const showScrollButtons = ref(false)
const isScrolledToStart = ref(true)
const isScrolledToEnd = ref(false)

function getScrollEl(): HTMLElement | undefined {
  const el = scrollAreaRef.value?.$el
  return el instanceof HTMLElement ? el : undefined
}

function checkScrollPosition() {
  const el = getScrollEl()
  if (!el) return
  const { scrollLeft, scrollWidth, clientWidth } = el
  isScrolledToStart.value = scrollLeft <= 0
  isScrolledToEnd.value = scrollLeft >= scrollWidth - clientWidth - 1
}

function checkIfScrollButtonsNeeded() {
  const el = getScrollEl()
  if (!el) return
  showScrollButtons.value = el.scrollWidth > el.clientWidth + 1
}

function updateScrollState() {
  checkIfScrollButtonsNeeded()
  checkScrollPosition()
}

function scrollTabsLeft() {
  getScrollEl()?.scrollBy({ left: -props.scrollStep, behavior: 'smooth' })
}

function scrollTabsRight() {
  getScrollEl()?.scrollBy({ left: props.scrollStep, behavior: 'smooth' })
}

function scrollToItem(index: number) {
  getScrollEl()?.scrollTo({ top: 0, left: index * props.itemWidth, behavior: 'smooth' })
}

function handleSelect(item: Resume, index: number) {
  activeId.value = item.id
  emit('option-change', item.id)
  scrollToItem(index)
}

let resizeObserver: ResizeObserver | undefined
let removeScrollListener: (() => void) | undefined

onMounted(async () => {
  await nextTick()
  const el = getScrollEl()
  if (!el) return
  el.addEventListener('scroll', checkScrollPosition, { passive: true })
  removeScrollListener = () => el.removeEventListener('scroll', checkScrollPosition)
  resizeObserver = new ResizeObserver(updateScrollState)
  resizeObserver.observe(el)
  updateScrollState()
})

onUnmounted(() => {
  removeScrollListener?.()
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="flex h-14 items-center border-b border-default bg-default">
    <div
      v-if="showScrollButtons"
      class="flex h-full shrink-0 items-center justify-center border-r border-default px-1"
      :class="{ hidden: isScrolledToStart }"
    >
      <UButton icon="i-lucide-arrow-left" variant="link" color="neutral" size="sm" @click="scrollTabsLeft" />
    </div>

    <UScrollArea
      ref="scrollAreaRef"
      orientation="horizontal"
      :ui="{ root: 'scrollbar-hidden h-full flex-1 min-w-0', viewport: 'h-full' }"
    >
      <div class="flex h-full items-stretch gap-1 px-1">
        <div
          v-for="(item, i) in options"
          :key="item.id"
          class="flex shrink-0 cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 border-transparent px-3 text-sm transition"
          :class="
            activeId === item.id
              ? 'border-default bg-default font-medium text-highlighted'
              : 'text-muted hover:bg-default'
          "
          @click="handleSelect(item, i)"
        >
          <UBadge
            color="neutral"
            :label="i + 1"
            :ui="{
              base: `px-1.5 py-0 rounded-full min-w-5 h-5 justify-center shrink-0 ${activeId === item.id ? 'bg-primary text-white' : 'bg-muted text-white'}`,
            }"
          />
          <span class="truncate">{{ item.name }}</span>
          <UBadge
            variant="soft"
            :label="RESUME_STATUS_META[item.status].label"
            :ui="{ base: `px-1 py-0 rounded-sm ${RESUME_STATUS_META[item.status].class}` }"
          />
          <span class="text-xs text-muted">{{ item.updatedAt }}</span>
        </div>
      </div>
    </UScrollArea>

    <div
      v-if="showScrollButtons"
      class="flex h-full shrink-0 items-center justify-center border-x border-default px-1"
      :class="{ hidden: isScrolledToEnd }"
    >
      <UButton icon="i-lucide-arrow-right" variant="link" color="neutral" size="sm" @click="scrollTabsRight" />
    </div>

    <div class="flex h-full shrink-0 items-center px-2">
      <UButton
        v-if="options.length > 1"
        icon="i-lucide-git-compare-arrows"
        color="primary"
        variant="outline"
        size="sm"
        label="对比"
        @click="emit('compare')"
      />
    </div>
  </div>
</template>
