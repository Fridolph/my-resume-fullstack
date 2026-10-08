<script setup lang="ts">
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeSettingsPanel from './ResumeSettingsPanel.vue'

/**
 * 展示设置抽屉（**壳**）。
 *
 * 用共享层的 `MyDrawer`（`packages/ui`，自动导入）：统一的 slot 契约 + 幂等关闭；
 * 宽度取 `2xl`（**640px**，见 MyDrawer 的尺寸表）。
 *
 * 槽位分工：
 * - `#header`：标题 + 说明（右侧关闭按钮）
 * - 默认槽（body，自带滚动容器）：`ResumeSettingsPanel`（Tabs 编排）
 * - `#footer`：保存状态 + 「重置 / 确认」；**改动是自动保存的**，所以「确认」= 关闭抽屉
 *   （不承担"写入"职责，否则会与自动保存重复一套入口）
 */
const open = defineModel<boolean>('open', { default: false })
const { saveState, savedAt, reset } = useResumeDisplay()

const statusText = computed(() => {
  if (saveState.value === 'pending') {
    return '保存中…'
  }
  if (saveState.value === 'saved' && savedAt.value) {
    return '已自动保存'
  }
  return '改动会自动保存'
})
</script>

<template>
  <MyDrawer
    v-model:open="open"
    :ui="{
      root: 'p-0',
      content: 'w-150!',
    }"
    direction="right"
    title="展示设置"
    description="布局 / 风格 / 主题 / 背景 / 区块显隐"
  >
    <template #header>
      <div class="flex w-full items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="resume-text text-sm font-semibold">展示设置</p>
          <p class="resume-muted mt-0.5 text-xs">
            布局 / 风格 / 主题 / 背景 / 区块显隐 —— 改动会自动保存
          </p>
        </div>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          aria-label="关闭"
          @click="open = false"
        />
      </div>
    </template>

    <ResumeSettingsPanel />

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="resume-muted text-xs">{{ statusText }}</span>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" label="重置" @click="reset" />
          <UButton label="确认" @click="open = false" />
        </div>
      </div>
    </template>
  </MyDrawer>
</template>
