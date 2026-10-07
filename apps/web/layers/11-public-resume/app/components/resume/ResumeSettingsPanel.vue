<script setup lang="ts">
import type { ResumeLayoutMode, ResumeSectionKey } from '../../types/resume'
import { resumeSectionDefinitions } from '../../config/resume-sections'
import { resumeBackgroundPresets, resumeThemePresets } from '../../mock/resume-display'
import { useResumeDisplay } from '../../composables/useResumeDisplay'

/**
 * 展示设置面板：布局 / 主题 / 背景 / 区块显隐。
 *
 * 它只调用 `useResumeDisplay` 的动作，不直接改配置对象；
 * 面板本体与页面分离，页面上才看得清「结构」，而不是被控件淹没。
 */
const {
  config,
  setLayoutMode,
  setSplitSide,
  toggleStickySide,
  setSideWidth,
  applyTheme,
  setTexture,
  setBackgroundType,
  setBackgroundImage,
  toggleSection,
} = useResumeDisplay()

const layoutModes: { value: ResumeLayoutMode, label: string, icon: string }[] = [
  { value: 'single', label: '通栏', icon: 'i-lucide-rows-3' },
  { value: 'split', label: '左右', icon: 'i-lucide-columns-2' },
  { value: 'threeColumn', label: '三栏', icon: 'i-lucide-columns-3' },
]

function isHidden(key: ResumeSectionKey) {
  return config.value.sections.hidden.includes(key)
}
</script>

<template>
  <div class="space-y-6" :style="{ color: 'var(--resume-text, #0f172a)' }">
    <div class="grid gap-4 lg:grid-cols-3">
      <!-- 布局 -->
      <section class="space-y-2">
        <p class="text-xs font-medium" :style="{ color: 'var(--resume-muted, #64748b)' }">布局</p>
        <div class="flex flex-wrap gap-2">
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
        <div v-if="config.layout.mode === 'split'" class="flex flex-wrap items-center gap-2 pt-1">
          <UButton
            size="xs"
            label="信息栏在左"
            :color="config.layout.splitSide === 'left' ? 'primary' : 'neutral'"
            :variant="config.layout.splitSide === 'left' ? 'soft' : 'outline'"
            @click="setSplitSide('left')"
          />
          <UButton
            size="xs"
            label="信息栏在右"
            :color="config.layout.splitSide === 'right' ? 'primary' : 'neutral'"
            :variant="config.layout.splitSide === 'right' ? 'soft' : 'outline'"
            @click="setSplitSide('right')"
          />
          <UButton
            size="xs"
            :color="config.layout.sideWidth === 'wide' ? 'primary' : 'neutral'"
            :variant="config.layout.sideWidth === 'wide' ? 'soft' : 'outline'"
            label="放宽信息栏"
            @click="setSideWidth(config.layout.sideWidth === 'wide' ? 'compact' : 'wide')"
          />
        </div>
        <div v-if="config.layout.mode !== 'single'" class="pt-1">
          <UButton
            size="xs"
            :color="config.layout.stickySide ? 'primary' : 'neutral'"
            :variant="config.layout.stickySide ? 'soft' : 'outline'"
            label="信息栏跟随滚动"
            @click="toggleStickySide"
          />
        </div>
      </section>

      <!-- 主题 -->
      <section class="space-y-2">
        <p class="text-xs font-medium" :style="{ color: 'var(--resume-muted, #64748b)' }">主题</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="preset in resumeThemePresets"
            :key="preset.id"
            size="xs"
            :label="preset.label"
            :color="config.theme.id === preset.id ? 'primary' : 'neutral'"
            :variant="config.theme.id === preset.id ? 'solid' : 'outline'"
            @click="applyTheme(preset)"
          />
        </div>
      </section>

      <!-- 背景 -->
      <section class="space-y-2">
        <p class="text-xs font-medium" :style="{ color: 'var(--resume-muted, #64748b)' }">背景</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="preset in resumeBackgroundPresets"
            :key="preset.id"
            size="xs"
            :label="preset.label"
            :color="config.background.textureId === preset.id && config.background.type !== 'image' ? 'primary' : 'neutral'"
            :variant="config.background.textureId === preset.id && config.background.type !== 'image' ? 'solid' : 'outline'"
            @click="setTexture(preset.id)"
          />
          <UButton
            size="xs"
            label="图片"
            icon="i-lucide-image"
            :color="config.background.type === 'image' ? 'primary' : 'neutral'"
            :variant="config.background.type === 'image' ? 'solid' : 'outline'"
            @click="setBackgroundType('image')"
          />
        </div>
        <template v-if="config.background.type === 'image'">
          <UInput
            size="xs"
            placeholder="背景图 URL（上传后置，本轮只建模）"
            :model-value="config.background.image.url"
            @update:model-value="setBackgroundImage({ url: String($event) })"
          />
          <div class="flex items-center gap-3">
            <span class="w-14 shrink-0 text-xs" :style="{ color: 'var(--resume-muted, #64748b)' }">遮罩</span>
            <USlider
              class="flex-1"
              :min="0"
              :max="100"
              :step="5"
              :model-value="config.background.image.overlay"
              @update:model-value="setBackgroundImage({ overlay: Number($event) })"
            />
          </div>
          <div class="flex items-center gap-3">
            <span class="w-14 shrink-0 text-xs" :style="{ color: 'var(--resume-muted, #64748b)' }">模糊</span>
            <USlider
              class="flex-1"
              :min="0"
              :max="20"
              :step="1"
              :model-value="config.background.image.blur"
              @update:model-value="setBackgroundImage({ blur: Number($event) })"
            />
          </div>
        </template>
      </section>
    </div>

    <!-- 区块编排 -->
    <section class="space-y-2">
      <p class="text-xs font-medium" :style="{ color: 'var(--resume-muted, #64748b)' }">
        区块显隐（顺序与归属见配置的 order / slot；拖拽排序在下一阶段接入）
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="definition in resumeSectionDefinitions"
          :key="definition.key"
          size="xs"
          :icon="definition.icon"
          :label="definition.label"
          :color="isHidden(definition.key) ? 'neutral' : 'primary'"
          :variant="isHidden(definition.key) ? 'outline' : 'soft'"
          @click="toggleSection(definition.key)"
        />
      </div>
    </section>
  </div>
</template>
