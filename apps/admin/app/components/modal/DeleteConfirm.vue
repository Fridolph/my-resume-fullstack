<script setup lang="ts">
import { useCountdown } from "@vueuse/core";

/**
 * ModalDeleteConfirm —— 删除确认弹窗（带倒计时防误删）
 *
 * 与 ModalConfirm 结构一致，区别是**确认按钮在倒计时结束前禁用**，防误点。
 * 倒计时期间按钮文案显示 `{confirmText} ({n})`，结束后变回 `{confirmText}`。
 * - 支持 v-model:open，也兼容 useOverlay 挂载（默认 open = true）。
 * - confirm 执行完成后自动关闭；取消仅关闭。
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    content?: string;
    icon?: string;
    cancelText?: string;
    confirmText?: string;
    /** 倒计时秒数（防误删）；0 表示不启用 */
    cooldown?: number;
    /** 点击确认时执行；返回 Promise 会等待完成再关闭 */
    confirm?: () => void | Promise<void>;
  }>(),
  {
    title: "Delete confirm",
    content: "",
    icon: "i-lucide-triangle-alert",
    cancelText: "Cancel",
    confirmText: "Delete",
    cooldown: 3,
  },
);

const emit = defineEmits<{ close: [payload?: boolean] }>();

const open = defineModel<boolean>("open", { default: true });

const loading = ref(false);
const { remaining, start } = useCountdown(() => props.cooldown);

const confirmLabel = computed(() =>
  remaining.value > 0 ? `${props.confirmText} (${remaining.value})` : props.confirmText,
);

function close(payload = true) {
  if (!open.value) return;
  open.value = false;
  emit("close", payload);
}

async function handleConfirm() {
  if (remaining.value > 0 || loading.value) return;
  loading.value = true;
  try {
    await props.confirm?.();
    close(true);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.cooldown > 0) start();
});
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
        :disabled="loading"
        :ui="{ base: 'min-w-20 justify-center' }"
        @click="close(false)"
      />
      <UButton
        :label="confirmLabel"
        color="error"
        :disabled="remaining > 0"
        :loading="loading"
        :ui="{ base: 'min-w-20 justify-center' }"
        @click="handleConfirm"
      />
    </template>
  </UModal>
</template>
