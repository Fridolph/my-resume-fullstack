<script setup lang="ts">
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeSettingsLayoutTab from './settings/ResumeSettingsLayoutTab.vue'
import ResumeSettingsSectionsTab from './settings/ResumeSettingsSectionsTab.vue'
import ResumeSettingsThemeTab from './settings/ResumeSettingsThemeTab.vue'

/**
 * 展示设置面板 —— 只做**编排**（Tabs 分组 + 数据就绪判断）。
 *
 * 分层（为接口预留）：
 *   ① 壳：`ResumeSettingsDrawer`（MyDrawer 的 header / footer / 关闭语义）
 *   ② 编排：**本组件** —— 决定「分几组」与「数据能不能渲染」
 *   ③ 内容：`settings/*Tab.vue` —— 每个 tab 内部再用 `ResumeSettingsGroup` 按模块分组
 *
 * ⚠️ 现在配置来自 `useResumeDisplay()`（本地状态 + 自动保存）。
 * **将来若改成从接口获取**：只在本组件把 store 换成 query（loading / empty / error 分支）即可，
 * 三个 tab 组件**不需要改** —— 它们只消费数据与动作，不关心数据从哪来。
 */
const { config } = useResumeDisplay()

/** 数据就绪判断位：本地状态恒为就绪；接接口后在这里接 loading / empty / error */
const ready = computed(() => Boolean(config.value))

const tabs = [
  { label: '布局与风格', icon: 'i-lucide-layout-panel-left', slot: 'layout' },
  { label: '主题与背景', icon: 'i-lucide-palette', slot: 'theme' },
  { label: '区块显隐', icon: 'i-lucide-list-tree', slot: 'sections' },
]
</script>

<template>
  <div class="resume-text">
    <p v-if="!ready" class="resume-muted text-sm">配置加载中…</p>

    <UTabs
      v-else
      :items="tabs"
      variant="link"
      :ui="{ list: 'mb-4', content: 'p-0' }"
    >
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
