<script setup lang="ts">
import type { ResumeLayoutMode, ResumeSectionKey } from '#layers/public-resume/app/types/resume'
import { resumeSectionDefinitions } from '#layers/public-resume/app/config/resume-sections'
import type { ResumeColorMode, ResumeThemeColorKey } from '#layers/public-resume/app/types/resume'
import {
  RESUME_CUSTOM_THEME,
  resumeBackgroundPresets,
  resumeStylePresets,
  resumeThemeFields,
  resumeThemePresets,
} from '#layers/public-resume/app/mock/resume-display'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'

/**
 * 展示设置面板：布局 / 主题 / 风格 / 背景 / 区块显隐。
 *
 * 它只调用 `useResumeDisplay` 的动作，不直接改配置对象；
 * 面板本体与页面分离，页面上才看得清「结构」，而不是被控件淹没。
 *
 * 四个维度互相正交：布局改怎么排、主题改什么颜色、风格改长什么样、
 * 背景改衬什么底 —— 改一个不影响另外三个。
 */
const {
  config,
  setLayoutMode,
  setSplitSide,
  toggleStickySide,
  setSideWidth,
  applyTheme,
  setMode,
  applyCustomTheme,
  setThemeField,
  setStyle,
  setTexture,
  setBackgroundType,
  setBackgroundImage,
  toggleSection,
} = useResumeDisplay()

const layoutModes: { value: ResumeLayoutMode; label: string; icon: string }[] = [
  { value: 'single', label: '通栏', icon: 'i-lucide-rows-3' },
  { value: 'split', label: '左右', icon: 'i-lucide-columns-2' },
  { value: 'threeColumn', label: '三栏', icon: 'i-lucide-columns-3' },
]

function isHidden(key: ResumeSectionKey) {
  return config.value.sections.hidden.includes(key)
}

/** 当前是否「自定义」主题 —— 只有它开放逐项编辑 */
const isCustomTheme = computed(() => config.value.theme.id === RESUME_CUSTOM_THEME.id)

/** 调色盘把 light / dark 两组平铺展示（顺序即展示顺序） */
const themeGroups: { mode: ResumeColorMode; label: string }[] = [
  { mode: 'light', label: '浅色' },
  { mode: 'dark', label: '深色' },
]

/** 读某一明暗组里的某个颜色 */
function themeValue(mode: ResumeColorMode, key: ResumeThemeColorKey): string {
  return config.value.theme[mode][key]
}
</script>

<template>
  <div class="resume-text space-y-6">
    <div class="grid gap-4 lg:grid-cols-3">
      <!-- 布局 -->
      <section class="space-y-2">
        <p class="resume-label">布局</p>
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

      <!-- 主题（配色）：预设 + 明暗 + 调色盘（两组平铺） -->
      <section class="space-y-3">
        <p class="resume-label">主题</p>
        <div class="resume-btn-group">
          <UButton
            v-for="preset in resumeThemePresets"
            :key="preset.id"
            size="xs"
            :label="preset.label"
            :color="config.theme.id === preset.id ? 'primary' : 'neutral'"
            :variant="config.theme.id === preset.id ? 'solid' : 'outline'"
            @click="applyTheme(preset)"
          />
          <UButton
            size="xs"
            :label="RESUME_CUSTOM_THEME.label"
            :icon="isCustomTheme ? 'i-lucide-pipette' : undefined"
            :color="isCustomTheme ? 'primary' : 'neutral'"
            :variant="isCustomTheme ? 'solid' : 'outline'"
            @click="applyCustomTheme"
          />
        </div>

        <!-- 明暗：与配色预设正交，独立一行 -->
        <div class="flex items-center gap-2">
          <span class="resume-label">明暗</span>
          <UButton
            v-for="group in themeGroups"
            :key="group.mode"
            size="xs"
            :icon="group.mode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
            :label="group.label"
            :color="config.theme.mode === group.mode ? 'primary' : 'neutral'"
            :variant="config.theme.mode === group.mode ? 'soft' : 'outline'"
            @click="setMode(group.mode)"
          />
        </div>

        <!-- 调色盘：浅色 / 深色两组平铺（预设态只读，自定义态可逐项改） -->
        <div class="space-y-3">
          <div v-for="group in themeGroups" :key="group.mode" class="space-y-1">
            <p class="resume-muted text-xs">
              {{ group.label }}模式<span v-if="config.theme.mode === group.mode"> · 当前</span>
            </p>
            <div v-for="field in resumeThemeFields" :key="field.key" class="flex items-center gap-2">
              <span
                class="size-4 shrink-0 rounded border"
                :style="{
                  background: themeValue(group.mode, field.key),
                  borderColor: 'var(--resume-border)',
                }"
              />
              <span class="resume-muted w-14 shrink-0 text-xs">{{ field.label }}</span>

              <template v-if="isCustomTheme">
                <UInput
                  size="xs"
                  class="min-w-0 flex-1"
                  :model-value="themeValue(group.mode, field.key)"
                  @update:model-value="setThemeField(group.mode, field.key, String($event))"
                />
                <UPopover>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-pipette"
                    :aria-label="`选择${group.label}模式的${field.label}`"
                  />
                  <template #content>
                    <UColorPicker
                      size="xs"
                      :model-value="themeValue(group.mode, field.key)"
                      @update:model-value="setThemeField(group.mode, field.key, $event ?? '')"
                    />
                  </template>
                </UPopover>
              </template>
              <code v-else class="resume-muted min-w-0 truncate text-xs">{{ themeValue(group.mode, field.key) }}</code>
            </div>
          </div>

          <p v-if="!isCustomTheme" class="resume-muted text-xs">
            预设只读；切到「自定义」后可逐项改（浅色 / 深色各一套）
          </p>
        </div>
      </section>

      <!-- 风格（区块长什么样） -->
      <section class="space-y-2">
        <p class="resume-label">风格</p>
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
        <p class="resume-muted text-xs">只管区块的样子，不改变颜色与顺序</p>
      </section>

      <!-- 背景 -->
      <section class="space-y-2">
        <p class="resume-label">背景</p>
        <div class="resume-btn-group">
          <UButton
            v-for="preset in resumeBackgroundPresets"
            :key="preset.id"
            size="xs"
            :label="preset.label"
            :color="
              config.background.textureId === preset.id && config.background.type !== 'image' ? 'primary' : 'neutral'
            "
            :variant="
              config.background.textureId === preset.id && config.background.type !== 'image' ? 'solid' : 'outline'
            "
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
            <span class="resume-muted w-14 shrink-0 text-xs">遮罩</span>
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
            <span class="resume-muted w-14 shrink-0 text-xs">模糊</span>
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
      <p class="resume-label">区块显隐（顺序与归属见配置的 order / slot；拖拽排序在下一阶段接入）</p>
      <div class="resume-btn-group">
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
