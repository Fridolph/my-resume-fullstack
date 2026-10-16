<script setup lang="ts">
import type { AdminBrandConfig, AdminNavigationItem } from '../../types/admin'

interface AdminSidebarProps {
  items: AdminNavigationItem[]
  externalItems?: AdminNavigationItem[]
  brand?: AdminBrandConfig
}

withDefaults(defineProps<AdminSidebarProps>(), {
  externalItems: () => [],
  brand: () => ({ name: 'Admin Studio', mark: 'A', href: '/' }),
})

const open = defineModel<boolean>('open', { default: true })
const collapsed = defineModel<boolean>('collapsed', { default: false })
</script>

<template>
  <UDashboardSidebar
    id="admin-sidebar"
    v-model:open="open"
    v-model:collapsed="collapsed"
    collapsible
    :collapsed-size="4.5"
    :ui="{
      root: 'bg-default',
      header: ['group px-4 py-5', collapsed ? 'justify-center' : 'justify-between'],
      body: 'px-2 py-3',
      footer: 'border-t border-default',
    }"
  >
    <template #header="{ collapsed: isCollapsed }">
      <NuxtLink
        :to="brand.href || '/'"
        class="flex min-w-0 items-center gap-3 text-highlighted"
        :aria-label="brand.name"
      >
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-inverted shadow-sm"
        >
          <img v-if="brand.logoSrc" :src="brand.logoSrc" :alt="brand.name" class="size-7 object-contain" />
          <span v-else>{{ brand.mark || brand.name.slice(0, 1) }}</span>
        </span>
        <span v-if="!isCollapsed" class="truncate text-base font-semibold">{{ brand.name }}</span>
      </NuxtLink>

      <UDashboardSidebarCollapse
        color="neutral"
        variant="ghost"
        :class="
          isCollapsed
            ? 'absolute opacity-0 transition-opacity group-hover:opacity-100'
            : 'opacity-0 transition-opacity group-hover:opacity-100'
        "
        aria-label="Collapse navigation"
      />
    </template>

    <template #default="{ collapsed: isCollapsed }">
      <UNavigationMenu
        :items="items"
        :collapsed="isCollapsed"
        orientation="vertical"
        tooltip
        popover
        :ui="{
          list: 'flex flex-col gap-1',
          link: 'min-h-11 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-highlighted data-active:bg-primary/10 data-active:text-primary data-active:font-semibold',
          linkLeadingIcon: 'size-5',
          linkTrailingIcon: 'size-4 text-dimmed',
          linkLabel: 'truncate',
          childLink:
            'min-h-9 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-elevated hover:text-highlighted data-active:text-primary',
        }"
      />

      <UNavigationMenu
        v-if="externalItems.length"
        :items="externalItems"
        :collapsed="isCollapsed"
        orientation="vertical"
        tooltip
        popover
        class="mt-auto pt-8"
        :ui="{
          list: 'flex flex-col gap-1',
          link: 'min-h-9 rounded-lg px-3 py-1.5 text-xs text-dimmed hover:bg-elevated hover:text-highlighted data-active:bg-elevated data-active:text-highlighted',
          linkLeadingIcon: 'size-4',
        }"
      />
    </template>

    <template #footer="{ collapsed: isCollapsed }">
      <slot name="footer" :collapsed="isCollapsed">
        <AdminUserMenu :collapsed="isCollapsed" />
      </slot>
    </template>
  </UDashboardSidebar>
</template>
