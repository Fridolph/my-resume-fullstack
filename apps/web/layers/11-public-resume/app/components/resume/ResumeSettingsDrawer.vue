<script setup lang="ts">
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeSettingsPanel from './ResumeSettingsPanel.vue'

/**
 * 展示设置抽屉。
 *
 * 设置本体仍是 `ResumeSettingsPanel`（纯内容组件），这里只管外壳与页脚。
 * 改动**自动保存**（见 useResumeDisplay 的持久化段），所以页脚不再有「保存」按钮，
 * 只显示保存状态 + 「重置」，避免"自动保存了还要再点一次"的歧义。
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
  <UDrawer v-model:open="open" direction="right" title="展示设置" description="布局 / 主题 / 风格 / 背景 / 区块显隐">
    <template #body>
      <ResumeSettingsPanel />
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <span class="resume-muted text-xs">{{ statusText }}</span>
        <UButton color="neutral" variant="ghost" label="重置" @click="reset" />
      </div>
    </template>
  </UDrawer>
</template>
