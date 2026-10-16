<script setup lang="ts">
import { adminBrand, adminExternalNavigation, adminNavigation } from '../config/admin-navigation'

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
const route = useRoute()
const sidebarOpen = ref(true)
const sidebarCollapsed = ref(false)

const pageTitle = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : 'Dashboard'))

/**
 * 页头搜索**默认关闭**，页面用 `definePageMeta({ headerSearch: true })` 打开。
 *
 * 布局与页面之间没有直接 props 通道，`route.meta` 是 Nuxt 里约定的那条路 ——
 * 这样"某个页面要不要搜索"由那个页面自己声明，不用在布局里维护一份页面清单。
 */
const showHeaderSearch = computed(() => route.meta.headerSearch === true)
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
        <!-- 注：曾在这里转发过 `<slot name="header-actions" />`，想让页面把"保存 / 取消"
             这类按钮投到 sticky 页头。**走不通**：页面组件的根模板不允许写具名插槽，
             Vue 编译器会报 `Codegen node is missing for element/if/for node`。
             现在各页面用**自己的 sticky 操作条**（见 resume/new.vue、resume/[id]/edit.vue）。 -->
        <AdminHeader :title="pageTitle" :show-search="showHeaderSearch" />
      </template>

      <template #body>
        <main class="mx-auto flex min-h-full w-full max-w-1920 flex-col">
          <slot />
        </main>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
