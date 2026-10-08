<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

/**
 * ModalConfirm —— 标准确认弹窗（参考 greensketch modal/Base.vue）
 *
 * 结构：icon（槽位 #icon）+ 内容（槽位 #default）+ 取消/确认按钮。
 * - 支持 v-model:open，也兼容 useOverlay 挂载（默认 open = true）。
 * - confirm 执行后自动关闭；取消仅关闭。
 */
const props = withDefaults(
  defineProps<{
    title?: string
    content?: string
    icon?: string
    cancelText?: string
    confirmText?: string
    confirm?: () => void | Promise<void>
  }>(),
  {
    title: 'Confirm',
    content: '',
    icon: 'i-lucide-triangle-alert',
    cancelText: 'Cancel',
    confirmText: 'Confirm',
  },
)

const emit = defineEmits<{ close: [payload?: boolean] }>()

const open = defineModel<boolean>('open', { default: true })

function close() {
  if (!open.value) return
  open.value = false
  emit('close', true)
}

// 200ms 防抖，避免连续点击重复触发
const handleCancel = useDebounceFn(() => close(), 200)
const handleConfirm = useDebounceFn(() => {
  props.confirm?.()
  close()
}, 200)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :dismissible="false"
    :close="false"
    :ui="{
      content: 'max-w-115',
      header: 'p-4!',
      body: 'p-4!',
      footer: 'p-4! justify-end gap-2',
    }"
  >
    <template #body>
      <div class="flex gap-x-4">
        <slot name="icon">
          <UIcon :name="icon" class="size-6 shrink-0 text-warning" />
        </slot>

        <div class="flex-1 space-y-4">
          <slot>
            <p class="text-sm text-muted">{{ content }}</p>
          </slot>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="cancelText"
        color="neutral"
        variant="outline"
        :ui="{ base: 'min-w-20 justify-center' }"
        @click="handleCancel"
      />
      <UButton :label="confirmText" :ui="{ base: 'min-w-20 justify-center' }" @click="handleConfirm" />
    </template>
  </UModal>
</template>
