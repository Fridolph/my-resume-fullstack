<script setup lang="ts">
import AppDrawer from './AppDrawer.vue'
import { cn } from '#layers/ui/app/lib/cn'
import { useNarrowScreen } from '#layers/ui/app/composables/useNarrowScreen'

/**
 * AppModal —— 共享对话框（`packages/ui`）
 *
 * 桌面（≥ `breakpoint`）用 `UModal`；**小于 `breakpoint` 时退化为抽屉**（移动端键盘友好、拇指可达）。
 * 移动分支直接复用 `AppDrawer`，所以两边的内置动作区、关闭语义不会各长一套。
 * slot 契约与 `AppDrawer` 完全一致：
 * `trigger` / 默认（body）/ `header` / `title` / `description` / `actions` / `close` / `footer`
 */
const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** 低于该宽度切换为抽屉 */
    breakpoint?: number
    /** 移动端抽屉从哪一侧滑出 */
    mobileDirection?: 'top' | 'right' | 'bottom' | 'left'
    /** 尺寸档位（移动端传给抽屉：侧边=宽度，上下=高度） */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    /** 是否允许用遮罩 / Esc / 滑动关闭 */
    dismissible?: boolean
    /** 底部状态文案（放在动作区左侧） */
    footerText?: string
    /** 是否渲染内置动作区（取消 / 确认） */
    showActions?: boolean
    confirmText?: string
    cancelText?: string
    /** 确认按钮的 loading（异步提交时用） */
    loading?: boolean
    /** 点确认后是否自动关闭（异步提交场景可设 false） */
    closeOnConfirm?: boolean
    /** 分别透传给 `UModal` / `AppDrawer` 的 ui 覆写 */
    ui?: { modal?: Record<string, any>; drawer?: Record<string, any> }
  }>(),
  {
    title: '',
    description: '',
    breakpoint: 768,
    mobileDirection: 'bottom',
    size: 'md',
    dismissible: true,
    footerText: '',
    showActions: false,
    confirmText: '确定',
    cancelText: '取消',
    loading: false,
    closeOnConfirm: true,
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
  /** 关闭（包含隐式关闭）；`confirmed` 为 true 表示"确认后关闭" */
  close: [confirmed?: boolean]
}>()

const open = defineModel<boolean>('open', { default: false })

const slots = defineSlots<{
  trigger?: () => unknown
  default?: (props: { close: (confirmed?: boolean) => void }) => unknown
  header?: (props: { close: (confirmed?: boolean) => void }) => unknown
  title?: () => unknown
  description?: () => unknown
  actions?: (props: { close: (confirmed?: boolean) => void }) => unknown
  close?: () => unknown
  footer?: (props: { close: (confirmed?: boolean) => void; confirm: () => void; cancel: () => void }) => unknown
}>()

/**
 * 窄屏判定。SSR 与客户端首次渲染都按"桌面"处理（见 useNarrowScreen），
 * 而浮层面板只在 `open` 为真时渲染 → 不会出现水合不一致。
 */
const isMobile = useNarrowScreen(() => `(max-width: ${props.breakpoint - 1}px)`)

function close(confirmed = false) {
  if (!open.value) {
    return
  }
  open.value = false
  emit('close', confirmed)
}

function onConfirm() {
  emit('confirm')
  if (props.closeOnConfirm && !props.loading) {
    close(true)
  }
}

function onCancel() {
  emit('cancel')
  close(false)
}

function onUpdateOpen(value: boolean) {
  if (value) {
    open.value = true
    return
  }
  close(false)
}

const modalUi = computed(() => {
  const user = props.ui?.modal ?? {}

  return {
    ...user,
    content: cn('overflow-hidden', user.content),
    header: cn('shrink-0', user.header),
    body: cn('contents', user.body),
    footer: cn('shrink-0', user.footer),
  }
})

/** 打开时不抢焦点（移动端会立刻弹键盘），并在不允许关闭时拦掉 Esc / 遮罩 */
const contentProps = computed(() => ({
  onOpenAutoFocus: (event: Event) => event.preventDefault(),
  ...(props.dismissible
    ? {}
    : {
        onEscapeKeyDown: (event: Event) => event.preventDefault(),
        onPointerDownOutside: (event: Event) => event.preventDefault(),
      }),
}))

const FORWARD_SLOTS = ['content', 'header', 'title', 'description', 'actions', 'close'] as const
const forwarded = computed(() => FORWARD_SLOTS.filter(name => name in slots))
</script>

<template>
  <UModal
    v-if="!isMobile"
    :open="open"
    :title="title"
    :description="description"
    :content="contentProps"
    :ui="modalUi"
    @update:open="onUpdateOpen"
  >
    <slot name="trigger" />

    <template v-for="name in forwarded" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="{ ...slotProps, close }" />
    </template>

    <template #body>
      <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <slot :close="close" />
      </div>
    </template>

    <template #footer>
      <slot v-if="slots.footer" name="footer" :close="close" :confirm="onConfirm" :cancel="onCancel" />
      <div v-else-if="showActions" class="flex w-full items-center justify-between gap-2">
        <span class="text-muted text-xs">{{ footerText }}</span>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" :label="cancelText" @click="onCancel" />
          <UButton :label="confirmText" :loading="loading" @click="onConfirm" />
        </div>
      </div>
    </template>
  </UModal>

  <!-- 移动端：直接复用共享抽屉，行为与 AppDrawer 完全一致 -->
  <AppDrawer
    v-else
    v-model:open="open"
    :title="title"
    :description="description"
    :direction="mobileDirection"
    :size="size"
    :dismissible="dismissible"
    :footer-text="footerText"
    :show-actions="showActions"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :loading="loading"
    :close-on-confirm="closeOnConfirm"
    :ui="ui?.drawer"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
    @close="(confirmed?: boolean) => emit('close', confirmed)"
  >
    <template v-if="slots.trigger" #trigger>
      <slot name="trigger" />
    </template>

    <template v-for="name in forwarded" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>

    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>

    <template v-if="slots.footer" #footer="slotProps">
      <slot name="footer" v-bind="slotProps" />
    </template>
  </AppDrawer>
</template>
