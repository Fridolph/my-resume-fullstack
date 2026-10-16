<script setup lang="ts">
import type { AdminBreadcrumb } from '../../types/admin'

/**
 * 后台页头（sticky）。
 *
 * **搜索默认不出现**：绝大多数页面没有可搜索的对象，铺一个永远没人用的输入框
 * 只会让每个页面看起来像"没做完"。需要搜索的页面用 `definePageMeta({ headerSearch: true })`
 * 显式打开 —— 布局会把该 meta 透传到这里（见 `layouts/has-sidebar.vue`）。
 *
 * ⚠️ 两处**有意移除**（若要回退，按需改回即可）：
 * - 写死的 `AD` 头像：它替一个不存在的用户打勾，而侧栏底部已有真实用户区（`AdminUserMenu`）；
 * - 通知铃铛：功能未实现，点了没有任何反馈，属于"假交互"。
 *   将来接入通知时再加回来，并从 `right` 插槽之外单独配置。
 */
withDefaults(
  defineProps<{
    title: string
    breadcrumbs?: AdminBreadcrumb[]
    /** 是否显示中间搜索框；由页面通过 `definePageMeta({ headerSearch: true })` 打开 */
    showSearch?: boolean
  }>(),
  {
    breadcrumbs: () => [],
    showSearch: false,
  },
)
</script>

<template>
  <UDashboardNavbar
    :ui="{
      root: 'sticky top-0 z-20 min-h-16 border-b border-default bg-default/90 py-3 backdrop-blur px-2 md:px-4',
      left: 'min-w-0 gap-3',
      title: 'min-w-0',
      right: 'gap-2',
    }"
  >
    <template #title>
      <div class="min-w-0">
        <UBreadcrumb
          v-if="breadcrumbs.length"
          :items="breadcrumbs"
          class="mb-0.5 hidden sm:flex"
          :ui="{ list: 'gap-1.5', link: 'text-xs text-muted' }"
        />
        <h1 class="truncate text-lg font-semibold tracking-tight text-highlighted sm:text-xl">
          {{ title }}
        </h1>
      </div>
    </template>

    <template #default>
      <slot name="center">
        <UInput v-if="showSearch" icon="i-lucide-search" placeholder="Search" class="hidden w-48 md:block lg:w-64" />
      </slot>
    </template>

    <template #right>
      <slot name="actions" />
      <slot name="profile" />
    </template>
  </UDashboardNavbar>
</template>
