<script setup lang="ts">
import { useResumeDisplay } from '../../composables/useResumeDisplay'
import ResumeSettingsPanel from './ResumeSettingsPanel.vue'

/**
 * 展示设置抽屉。
 *
 * 原先设置面板以内联方式塞在页面头部下方，开合会推挤正文；改由右侧 Drawer 承载后，
 * 头部高度恒定。设置本体仍是 `ResumeSettingsPanel`（纯内容组件），这里只管外壳与页脚动作。
 */
const open = defineModel<boolean>('open', { default: false })
const { isDirty, saveLocal, reset } = useResumeDisplay()
</script>

<template>
  <UDrawer
    v-model:open="open"
    direction="right"
    title="展示设置"
    description="布局 / 主题 / 背景 / 区块显隐"
    :ui="{ content: 'w-full sm:max-w-md' }"
  >
    <template #body>
      <ResumeSettingsPanel />
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="text-xs text-muted">
          {{ isDirty ? '有未保存的改动' : '所有改动已保存' }}
        </span>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" label="重置" @click="reset" />
          <UButton icon="i-lucide-save" label="保存" @click="saveLocal" />
        </div>
      </div>
    </template>
  </UDrawer>
</template>
