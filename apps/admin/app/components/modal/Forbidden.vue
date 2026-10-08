<script setup lang="ts">
/**
 * ModalForbidden —— 无权限 / 受限提示弹窗（参考 greensketch modal/Forbidden.vue）
 * 结构：居中 icon + 提示文案，可点击遮罩关闭（dismissible）。
 */
withDefaults(
  defineProps<{
    message?: string
    icon?: string
  }>(),
  {
    message: 'You do not have permission to perform this action.',
    icon: 'i-lucide-lock',
  },
)

const open = defineModel<boolean>('open', { default: true })
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="true"
    :ui="{
      header: 'hidden',
      content: 'divide-none max-w-xs',
      body: 'px-4 py-6 sm:px-6',
      footer: 'hidden',
    }"
  >
    <template #body>
      <div class="flex flex-col items-center gap-4 py-4">
        <UIcon :name="icon" class="size-12 text-muted" />
        <p class="text-center text-sm text-muted">{{ message }}</p>
      </div>
    </template>
  </UModal>
</template>
