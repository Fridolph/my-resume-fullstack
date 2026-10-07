<script setup lang="ts">
import { useResumeAdmin } from '../../composables/useResumeAdmin'
import ResumeAdminLoginModal from './ResumeAdminLoginModal.vue'

/**
 * 登录入口：按钮与登录弹窗一体。
 *
 * - `text`：页面头部的完整按钮（默认）
 * - `icon`：收起态图标，供第 2 期的左侧窄栏（rail）直接复用
 *
 * 弹窗状态收在组件内部，页面因此不再需要持有 `loginOpen`。
 */
withDefaults(defineProps<{ variant?: 'text' | 'icon' }>(), { variant: 'text' })

const { session, isAdmin, signOut } = useResumeAdmin()
const open = ref(false)
</script>

<template>
  <template v-if="isAdmin">
    <UBadge
      v-if="variant === 'text'"
      color="success"
      variant="subtle"
      :label="`编辑模式 · ${session?.username}`"
    />

    <UButton
      v-if="variant === 'text'"
      size="xs"
      color="neutral"
      variant="outline"
      icon="i-lucide-log-out"
      label="退出"
      @click="signOut"
    />
    <UTooltip v-else text="退出管理登录">
      <UButton
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-log-out"
        aria-label="退出管理登录"
        @click="signOut"
      />
    </UTooltip>
  </template>

  <template v-else>
    <UButton
      v-if="variant === 'text'"
      size="xs"
      color="neutral"
      variant="outline"
      icon="i-lucide-log-in"
      label="管理员登录"
      @click="open = true"
    />
    <UTooltip v-else text="管理员登录">
      <UButton
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-shield-user"
        aria-label="管理员登录"
        @click="open = true"
      />
    </UTooltip>
  </template>

  <ResumeAdminLoginModal v-model:open="open" />
</template>
