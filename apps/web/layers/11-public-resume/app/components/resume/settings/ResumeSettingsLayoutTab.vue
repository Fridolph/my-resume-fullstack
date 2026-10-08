<script setup lang="ts">
import type { ResumeLayoutMode } from '#layers/public-resume/app/types/resume'
import { resumeStylePresets } from '#layers/public-resume/app/mock/resume-display'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeSettingsGroup from './ResumeSettingsGroup.vue'

/**
 * 展示设置 · 「布局与风格」tab。
 *
 * 三个模块各自成组：
 * - **布局**：通栏 / 左右 / 三栏（三选一）
 * - **信息栏位置**：`在左 / 在右` 是**互斥**选项，`放宽 / 跟随滚动` 是**各自独立的开关**
 *   —— 四项放同一组便于比较，但语义分两类（组下有说明）
 * - **风格**：极简 / 标准 / 精致
 *
 * 本组件只消费数据 + 调动作，不发请求、不判断数据是否就绪（那在 `ResumeSettingsPanel`）。
 */
const {
  config,
  setLayoutMode,
  setSplitSide,
  toggleSideWidth,
  toggleStickySide,
  setStyle,
} = useResumeDisplay()

const layoutModes: { value: ResumeLayoutMode, label: string, icon: string }[] = [
  { value: 'single', label: '通栏', icon: 'i-lucide-rows-3' },
  { value: 'split', label: '左右', icon: 'i-lucide-columns-2' },
  { value: 'threeColumn', label: '三栏', icon: 'i-lucide-columns-3' },
]

/** 单栏模式下没有"信息栏"，给个提示而不是静默失效 */
const sideHint = computed(() => (config.value.layout.mode === 'single' ? '通栏模式无信息栏，切到左右 / 三栏生效' : ''))
</script>

<template>
  <div class="space-y-5">
    <ResumeSettingsGroup title="布局">
      <div class="resume-btn-group">
        <UButton
          v-for="item in layoutModes"
          :key="item.value"
          size="xs"
          :icon="item.icon"
          :label="item.label"
          :color="config.layout.mode === item.value ? 'primary' : 'neutral'"
          :variant="config.layout.mode === item.value ? 'solid' : 'outline'"
          @click="setLayoutMode(item.value)"
        />
      </div>
    </ResumeSettingsGroup>

    <ResumeSettingsGroup title="信息栏位置" :hint="sideHint || '前两项二选一，后两项各自独立'">
      <div class="resume-btn-group">
        <UButton
          size="xs"
          label="在左"
          icon="i-lucide-arrow-left-to-line"
          :color="config.layout.splitSide === 'left' ? 'primary' : 'neutral'"
          :variant="config.layout.splitSide === 'left' ? 'solid' : 'outline'"
          @click="setSplitSide('left')"
        />
        <UButton
          size="xs"
          label="在右"
          icon="i-lucide-arrow-right-to-line"
          :color="config.layout.splitSide === 'right' ? 'primary' : 'neutral'"
          :variant="config.layout.splitSide === 'right' ? 'solid' : 'outline'"
          @click="setSplitSide('right')"
        />
        <UButton
          size="xs"
          label="放宽"
          icon="i-lucide-move-horizontal"
          :color="config.layout.sideWidth === 'wide' ? 'primary' : 'neutral'"
          :variant="config.layout.sideWidth === 'wide' ? 'soft' : 'outline'"
          @click="toggleSideWidth"
        />
        <UButton
          size="xs"
          label="跟随滚动"
          icon="i-lucide-pin"
          :color="config.layout.stickySide ? 'primary' : 'neutral'"
          :variant="config.layout.stickySide ? 'soft' : 'outline'"
          @click="toggleStickySide"
        />
      </div>
    </ResumeSettingsGroup>

    <ResumeSettingsGroup title="风格" hint="只管区块的样子，不改变颜色与顺序">
      <div class="resume-btn-group">
        <UButton
          v-for="preset in resumeStylePresets"
          :key="preset.id"
          size="xs"
          :icon="preset.icon"
          :label="preset.label"
          :color="config.style.id === preset.id ? 'primary' : 'neutral'"
          :variant="config.style.id === preset.id ? 'solid' : 'outline'"
          @click="setStyle(preset.id)"
        />
      </div>
    </ResumeSettingsGroup>
  </div>
</template>
