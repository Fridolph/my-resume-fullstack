<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import { cn } from "~/utils/cn";

/**
 * ModalResponsive —— 响应式对话框（参考 greensketch modal/Responsive.vue）
 *
 * 桌面（≥768px）用 UModal，移动端用 UDrawer；对外暴露统一的一组槽位：
 * content / header / title / description / actions / close / footer，以及默认槽（body）。
 * - 支持 v-model:open，也兼容 useOverlay 挂载（默认 open = true）。
 * - 统一处理隐式关闭（点遮罩 / Esc / Drawer 滑动）。
 */
const props = defineProps<{
  title?: string;
  description?: string;
  ui?: { modal?: Record<string, any>; drawer?: Record<string, any> };
}>();

const emit = defineEmits<{ close: [payload?: boolean] }>();

const open = defineModel<boolean>("open", { default: true });

const isDesktop = useMediaQuery("(min-width: 768px)", { ssrWidth: 768 });

// 防止 close 触发两次：一次来自显式关闭按钮，一次来自关闭动画结束后 Reka 的 update:open(false)
function close(payload?: boolean) {
  if (!open.value) return;
  open.value = false;
  emit("close", payload);
}

// 捕获隐式关闭：点遮罩、Esc、Drawer 滑动
function onUpdateOpen(value: boolean) {
  if (value) {
    open.value = true;
    return;
  }
  close();
}

// 合并默认壳样式 + 调用方 ui 覆盖
function shellUi(user?: Record<string, any>, extra?: Record<string, string>) {
  return {
    ...user,
    ...extra,
    content: cn("overflow-hidden", user?.content),
    header: cn("shrink-0", user?.header),
    body: "contents",
    footer: cn("shrink-0", user?.footer),
  };
}

const modalUi = computed(() => shellUi(props.ui?.modal));

const drawerUi = computed(() =>
  shellUi(props.ui?.drawer, {
    container: cn("flex-1 min-h-0 overflow-hidden", props.ui?.drawer?.container),
  }),
);

const scrollBodyClass = computed(() => {
  const user = isDesktop.value ? props.ui?.modal?.body : props.ui?.drawer?.body;
  const padding = isDesktop.value ? "p-4 sm:p-6" : "px-4";
  return cn("min-h-0 flex-1 overflow-y-auto", padding, user);
});
</script>

<template>
  <UModal
    v-if="isDesktop"
    :open="open"
    :title="props.title"
    :description="props.description"
    :ui="modalUi"
    :content="{ onOpenAutoFocus: (e) => e.preventDefault() }"
    :close="{ onClick: () => close() }"
    @update:open="onUpdateOpen"
  >
    <template v-if="$slots.content" #content>
      <slot name="content" :close="close" />
    </template>
    <template v-if="$slots.header" #header>
      <slot name="header" :close="close" />
    </template>
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.description" #description>
      <slot name="description" />
    </template>
    <template v-if="$slots.actions" #actions>
      <slot name="actions" :close="close" />
    </template>
    <template v-if="$slots.close" #close="slotProps">
      <slot name="close" v-bind="slotProps" />
    </template>
    <template #body>
      <div :class="scrollBodyClass">
        <slot :close="close" />
      </div>
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" :close="close" />
    </template>
  </UModal>

  <UDrawer
    v-else
    :open="open"
    :title="props.title"
    :description="props.description"
    :ui="drawerUi"
    :should-scale-background="false"
    :set-background-color-on-scale="false"
    @update:open="onUpdateOpen"
  >
    <template v-if="$slots.content" #content>
      <slot name="content" :close="close" />
    </template>
    <template v-if="$slots.header" #header>
      <slot name="header" :close="close" />
    </template>
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.description" #description>
      <slot name="description" />
    </template>
    <template v-if="$slots.actions" #actions>
      <slot name="actions" :close="close" />
    </template>
    <template v-if="$slots.close" #close="slotProps">
      <slot name="close" v-bind="slotProps" />
    </template>
    <template #body>
      <div :class="scrollBodyClass">
        <slot :close="close" />
      </div>
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" :close="close" />
    </template>
  </UDrawer>
</template>
