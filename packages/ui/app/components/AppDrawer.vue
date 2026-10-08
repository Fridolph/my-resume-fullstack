<script setup lang="ts">
import { cn } from '#layers/ui/app/lib/cn'

/**
 * AppDrawer —— 共享抽屉（`packages/ui`）
 *
 * 与 `AppModal` 共用同一套 slot 契约：
 * `trigger` / 默认（body）/ `header` / `title` / `description` / `actions` / `close` / `footer`
 *
 * 约定：
 * - 隐式关闭（点遮罩 / Esc / 滑动）与显式关闭**统一走 `close()`**，且只 emit 一次
 *   （Reka 在关闭动画结束后还会再触发一次 `update:open(false)`，不拦截就会 emit 两次）
 * - 面板只在 `open` 为真时渲染 → 默认不需要 `ClientOnly`，SSR 首屏不会出现浮层
 */
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  /** 抽屉从哪一侧滑出 */
  direction?: 'top' | 'right' | 'bottom' | 'left'
  /** 尺寸档位：侧边抽屉=宽度，上下抽屉=高度 */
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
  /** 透传给底层 `UDrawer` 的 ui 覆写 */
  ui?: Record<string, any>
}>(), {
  title: '',
  description: '',
  direction: 'right',
  size: 'md',
  dismissible: true,
  footerText: '',
  showActions: false,
  confirmText: '确定',
  cancelText: '取消',
  loading: false,
  closeOnConfirm: true,
})

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
  footer?: (props: { close: (confirmed?: boolean) => void, confirm: () => void, cancel: () => void }) => unknown
}>()

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

/** Reka 在关闭动画后还会再触发一次，交给 close() 去做幂等 */
function onUpdateOpen(value: boolean) {
  if (value) {
    open.value = true
    return
  }
  close(false)
}

/** 侧边抽屉=宽度；上下抽屉=高度（Tailwind 类必须是字面量，所以写成映射表） */
const SIZE_CLASS: Record<NonNullable<typeof props.size>, { side: string, top: string }> = {
  sm: { side: 'sm:max-w-sm', top: 'max-h-[40vh]' },
  md: { side: 'sm:max-w-md', top: 'max-h-[60vh]' },
  lg: { side: 'sm:max-w-lg', top: 'max-h-[75vh]' },
  xl: { side: 'sm:max-w-xl', top: 'max-h-[85vh]' },
  full: { side: 'sm:max-w-full', top: 'max-h-[95vh]' },
}

const drawerUi = computed(() => {
  const user = props.ui ?? {}
  // `!`：withDefaults 已经保证有默认值，但 noUncheckedIndexedAccess 下索引仍被视为可能 undefined
  const size = SIZE_CLASS[props.size ?? 'md']!
  const vertical = props.direction === 'top' || props.direction === 'bottom'
  const sizeClass = vertical ? size.top : size.side

  return {
    ...user,
    content: cn('overflow-hidden', sizeClass, user.content),
    header: cn('shrink-0', user.header),
    body: cn('contents', user.body),
    footer: cn('shrink-0', user.footer),
  }
})

/** 不允许关闭时拦掉 Esc 与遮罩点击（Reka 的事件口子） */
const contentProps = computed(() => {
  if (props.dismissible) {
    return undefined
  }

  return {
    onEscapeKeyDown: (event: Event) => event.preventDefault(),
    onPointerDownOutside: (event: Event) => event.preventDefault(),
  }
})

/** 转发实际存在的槽位，避免在不使用时生成空容器 */
const FORWARD_SLOTS = ['content', 'header', 'title', 'description', 'actions', 'close'] as const
const forwarded = computed(() => FORWARD_SLOTS.filter(name => name in slots))
</script>

<template>
  <UDrawer
    :open="open"
    :title="title"
    :description="description"
    :direction="direction"
    :content="contentProps"
    :ui="drawerUi"
    :should-scale-background="false"
    :set-background-color-on-scale="false"
    @update:open="onUpdateOpen"
  >
    <slot name="trigger" />

    <template
      v-for="name in forwarded"
      :key="name"
      #[name]="slotProps"
    >
      <slot :name="name" v-bind="{ ...slotProps, close }" />
    </template>

    <template #body>
      <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <slot :close="close" />
      </div>
    </template>

    <template #footer>
      <slot
        v-if="slots.footer"
        name="footer"
        :close="close"
        :confirm="onConfirm"
        :cancel="onCancel"
      />
      <div v-else-if="showActions" class="flex w-full items-center justify-between gap-2">
        <span class="text-muted text-xs">{{ footerText }}</span>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" :label="cancelText" @click="onCancel" />
          <UButton :label="confirmText" :loading="loading" @click="onConfirm" />
        </div>
      </div>
    </template>
  </UDrawer>
</template>
