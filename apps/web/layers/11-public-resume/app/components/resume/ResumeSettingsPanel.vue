<script setup lang="ts">
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeSettingsLayoutTab from './settings/ResumeSettingsLayoutTab.vue'
import ResumeSettingsSectionsTab from './settings/ResumeSettingsSectionsTab.vue'
import ResumeSettingsThemeTab from './settings/ResumeSettingsThemeTab.vue'

/**
 * 展示设置面板 —— 只做**编排**（Tabs 分组 + 数据就绪 + 按权限过滤）。
 *
 * 分层（为接口预留）：
 *   ① 壳：`ResumeSettingsDrawer`（MyDrawer 的 header / footer / 关闭语义）
 *   ② 编排：**本组件** —— 决定「分几组」「数据能不能渲染」「哪几组对这个身份可见」
 *   ③ 内容：`settings/*Tab.vue` —— 每个 tab 内部再用 `ResumeSettingsGroup` 按模块分组
 *
 * **权限分层**（见 `docs/dev/identity-and-access.md` §2）：
 * - 这一层管「**能不能看到这一组**」——无 `view` 权限的 tab 直接不出现在 tabs 里；
 * - 「能不能操作」交给 tab 内部：`ResumeSettingsGroup` 的 `locked` 会整组禁用控件。
 *
 * ⚠️ 现在配置来自 `useResumeDisplay()`（本地状态 + 自动保存）。
 * **将来若改成从接口获取**：只在本组件把 store 换成 query（loading / empty / error 分支）即可。
 */
const { config } = useResumeDisplay()
const { canViewDisplay, canViewSections, canViewTheme } = usePermission()

/** 数据就绪判断位：本地状态恒为就绪；接接口后在这里接 loading / empty / error */
const ready = computed(() => Boolean(config.value))

const tabs = computed(() =>
  [
    canViewDisplay.value ? { label: '布局与风格', icon: 'i-lucide-layout-panel-left', slot: 'layout' } : null,
    canViewTheme.value ? { label: '主题与背景', icon: 'i-lucide-palette', slot: 'theme' } : null,
    canViewSections.value ? { label: '区块显隐', icon: 'i-lucide-list-tree', slot: 'sections' } : null,
  ].filter(item => item !== null),
)
</script>

<template>
  <div class="resume-text">
    <p v-if="!ready" class="resume-muted text-sm">配置加载中…</p>

    <UTabs v-else :items="tabs" variant="link" :ui="{ list: 'mb-4', content: 'p-0' }">
      <template #layout>
        <ResumeSettingsLayoutTab />
      </template>

      <template #theme>
        <ResumeSettingsThemeTab />
      </template>

      <template #sections>
        <ResumeSettingsSectionsTab />
      </template>
    </UTabs>
  </div>
</template>
