<script setup lang="ts">
import { adminBrand, adminExternalNavigation, adminNavigation } from "../config/admin-navigation";

/**
 * has-sidebar —— 通用后台布局
 *
 * 结构：
 *  - 左侧：可折叠 Sidebar（品牌区 + 1/2 级导航 + 外部链接 + 用户区）
 *  - 右侧：UDashboardPanel
 *    - header：Sticky Header（AdminHeader，吸附顶部）
 *    - body：可滚动主内容区（<slot />）
 *
 * 页面通过 `definePageMeta({ layout: "has-sidebar", title: "..." })` 使用；
 * `title` 会作为 Sticky Header 的标题，也支持 `breadcrumbs`。
 */
const route = useRoute();
const sidebarOpen = ref(true);
const sidebarCollapsed = ref(false);

const pageTitle = computed(() =>
  typeof route.meta.title === "string" ? route.meta.title : "Dashboard",
);
</script>

<template>
  <UDashboardGroup unit="rem" class="min-h-dvh" style="--ui-header-height: 4rem">
    <AdminSidebar
      v-model:open="sidebarOpen"
      v-model:collapsed="sidebarCollapsed"
      :brand="adminBrand"
      :items="adminNavigation"
      :external-items="adminExternalNavigation"
    />

    <UDashboardPanel
      id="admin-content"
      :ui="{
        root: 'min-w-0 p-0',
        body: 'min-h-0 overflow-y-auto p-0 sm:p-0',
      }"
    >
      <template #header>
        <AdminHeader :title="pageTitle" />
      </template>

      <template #body>
        <main class="mx-auto flex min-h-full w-full max-w-1920 flex-col">
          <slot />
        </main>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
