<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

interface UserMenuProps {
  collapsed?: boolean;
}

const props = withDefaults(defineProps<UserMenuProps>(), { collapsed: false });

const toast = useToast();

// Mock 用户信息 —— 接入真实账号后替换为 store / useAuthState 的数据。
const user = {
  name: "Admin User",
  email: "admin@example.com",
  initials: "AD",
  avatar: undefined as string | undefined,
};

const items = computed<DropdownMenuItem[][]>(() => [
  // 第一组：用户信息（自定义 label slot）
  [{ type: "label", slot: "user" }],
  // 第二组：账号相关
  [
    {
      label: "My account",
      icon: "i-lucide-user-round",
      onSelect: () => {
        toast.add({
          title: "My account",
          description: "TODO: 接入账号详情页/弹窗",
          color: "info",
        });
      },
    },
    { label: "Settings", icon: "i-lucide-settings-2", to: "/settings" },
  ],
  // 第三组：退出
  [
    {
      label: "Sign out",
      icon: "i-lucide-log-out",
      color: "error",
      onSelect: () => {
        toast.add({ title: "Signed out (demo)", color: "success" });
        navigateTo("/login");
      },
    },
  ],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ side: props.collapsed ? 'right' : 'top', align: 'start' }"
    :ui="{ content: 'min-w-60' }"
  >
    <UButton
      :avatar="
        user.avatar ? { src: user.avatar, alt: user.name } : { text: user.initials, alt: user.name }
      "
      color="neutral"
      variant="ghost"
      block
      :square="props.collapsed"
      :trailing-icon="props.collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      :ui="{
        base: 'justify-start px-2 py-1.5 data-[state=open]:bg-elevated',
        leadingAvatar: 'size-8',
        trailingIcon: 'text-dimmed',
      }"
    >
      <span v-if="!props.collapsed" class="flex min-w-0 flex-col items-start text-left">
        <span class="w-full truncate text-sm font-medium text-highlighted">{{ user.name }}</span>
        <span class="w-full truncate text-xs text-muted">{{ user.email }}</span>
      </span>
    </UButton>

    <template #user-label>
      <div class="flex items-center gap-2 py-0.5">
        <UAvatar :text="user.initials" :alt="user.name" size="sm" />
        <div class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-semibold text-highlighted">{{ user.name }}</span>
          <span class="truncate text-xs text-muted">{{ user.email }}</span>
        </div>
      </div>
    </template>
  </UDropdownMenu>
</template>
