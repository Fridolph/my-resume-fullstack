<script setup lang="ts">
import { settingsNavigation } from "../config/settings-navigation";

/**
 * Settings 父页：在 has-sidebar 布局内再叠一层「二级左侧 sidebar」。
 * - 左侧：settingsNavigation 二级导航
 * - 右侧：<NuxtPage /> 渲染子页面（/settings/company、/settings/team …）
 */
definePageMeta({
  layout: "has-sidebar",
  title: "Settings",
});
</script>

<template>
  <section class="flex min-h-0 flex-1">
    <aside class="hidden w-60 shrink-0 border-r border-default bg-default lg:block">
      <div class="p-0 mt-3 pl-3">
        <h2 class="text-lg font-semibold tracking-tight text-highlighted">Settings</h2>
      </div>

      <UNavigationMenu
        orientation="vertical"
        :items="settingsNavigation"
        :ui="{
          list: 'flex flex-col gap-1 p-2',
          link: 'min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-highlighted data-active:bg-primary/10 data-active:text-primary data-active:font-semibold',
          linkLeadingIcon: 'size-4',
          label: 'px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-dimmed',
        }"
      />
    </aside>

    <div class="min-h-0 min-w-0 flex-1 overflow-y-auto content-pad">
      <NuxtPage />
    </div>
  </section>
</template>
