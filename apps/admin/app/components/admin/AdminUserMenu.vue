<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * 侧栏底部的用户区。
 *
 * 数据来自 `useAuthState` 的真实会话（登录时写 cookie，刷新后由 `/auth/info` 恢复）；
 * 未登录时退化为「去登录」入口，不再显示写死的 mock 用户 ——
 * 否则界面会替一个不存在的账号打勾（admin 接入真实登录前的老问题）。
 */
interface UserMenuProps {
  collapsed?: boolean
}

const props = withDefaults(defineProps<UserMenuProps>(), { collapsed: false })

const toast = useToast()
const { user, isAuthed, signOut } = useAuthState()

const displayName = computed(() => user.value?.name ?? '未登录')
const displayEmail = computed(() => user.value?.email || (isAuthed.value ? '' : '点击登录'))

/** 退出 = 本地清空 + 跳登录页：令牌在 cookie 里，没有服务端会话要注销 */
async function handleSignOut() {
  signOut()
  await navigateTo('/login')
}

const items = computed<DropdownMenuItem[][]>(() => [
  // 第一组：用户信息（自定义 label slot）
  [{ type: 'label', slot: 'user' }],
  // 第二组：账号相关
  [
    {
      label: 'My account',
      icon: 'i-lucide-user-round',
      onSelect: () => {
        toast.add({
          title: 'My account',
          description: 'TODO: 接入账号详情页/弹窗',
          color: 'info',
        })
      },
    },
    { label: 'Settings', icon: 'i-lucide-settings-2', to: '/settings' },
  ],
  // 第三组：登录 / 退出（按当前会话状态二选一）
  [
    isAuthed.value
      ? { label: 'Sign out', icon: 'i-lucide-log-out', color: 'error' as const, onSelect: handleSignOut }
      : { label: 'Sign in', icon: 'i-lucide-log-in', to: '/login' },
  ],
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ side: props.collapsed ? 'right' : 'top', align: 'start' }"
    :ui="{ content: 'min-w-60' }"
  >
    <UButton
      :avatar="user ? { text: user.initials, alt: user.name } : { icon: 'i-lucide-user-round', alt: '未登录' }"
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
        <span class="w-full truncate text-sm font-medium text-highlighted">{{ displayName }}</span>
        <span v-if="displayEmail" class="w-full truncate text-xs text-muted">{{ displayEmail }}</span>
      </span>
    </UButton>

    <template #user-label>
      <div class="flex items-center gap-2 py-0.5">
        <UAvatar :text="user?.initials" icon="i-lucide-user-round" :alt="displayName" size="sm" />
        <div class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-semibold text-highlighted">{{ displayName }}</span>
          <span v-if="displayEmail" class="truncate text-xs text-muted">{{ displayEmail }}</span>
        </div>
      </div>
    </template>
  </UDropdownMenu>
</template>
