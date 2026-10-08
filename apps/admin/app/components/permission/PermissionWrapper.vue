<script setup lang="ts">
/**
 * PermissionWrapper —— 按权限控制内容显隐（参考 greensketch PermissionWrapper）
 *
 * - `permissions`：需要的权限（字符串，或数组——数组要求全部满足）；不传 → 始终显示。
 * - 权限来源见 `usePermission()`；接入认证后在 session 就绪时写入。
 * - 内部 `ClientOnly`：SSR 阶段权限尚未就绪，避免服务端渲染出不该出现的内容。
 * - 默认插槽作用域提供 `permission-keys` / `has-permission`，便于子内容自行判断。
 */
interface PermissionWrapperProps {
  permissions?: string | string[];
}

const { permissions } = defineProps<PermissionWrapperProps>();

const { permissionKeys, hasPermission } = usePermission();

const showSlot = computed(() => {
  if (!permissions) return true;

  if (!permissionKeys.value.length) return false;

  return hasPermission(permissions);
});
</script>

<template>
  <ClientOnly>
    <slot v-if="showSlot" :permission-keys="permissionKeys" :has-permission="hasPermission" />
  </ClientOnly>
</template>
