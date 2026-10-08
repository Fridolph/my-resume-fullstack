<script setup lang="ts">
import type { ResumeColorMode, ResumeThemeColorKey } from '#layers/public-resume/app/types/resume'
import {
  RESUME_CUSTOM_THEME,
  resumeBackgroundPresets,
  resumeThemeFields,
  resumeThemePresets,
} from '#layers/public-resume/app/mock/resume-display'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeSettingsGroup from './ResumeSettingsGroup.vue'

/**
 * 展示设置 · 「主题与背景」tab。
 *
 * 四个模块各自成组：配色（预设 + 自定义）/ 明暗 / 调色盘 / 背景。
 * 只消费数据 + 调动作（不判断数据就绪、不发请求）。
 */
const {
  config,
  applyTheme,
  setMode,
  applyCustomTheme,
  setThemeField,
  setTexture,
  setBackgroundType,
  setBackgroundImage,
} = useResumeDisplay()

/** 当前是否「自定义」主题 —— 只有它开放逐项编辑 */
const isCustomTheme = computed(() => config.value.theme.id === RESUME_CUSTOM_THEME.id)

/** 调色盘把 light / dark 两组平铺展示（顺序即展示顺序） */
const themeGroups: { mode: ResumeColorMode, label: string }[] = [
  { mode: 'light', label: '浅色' },
  { mode: 'dark', label: '深色' },
]

/** 读某一明暗组里的某个颜色 */
function themeValue(mode: ResumeColorMode, key: ResumeThemeColorKey): string {
  return config.value.theme[mode][key]
}
</script>

<template>
  <div class="space-y-5">
    <ResumeSettingsGroup title="配色">
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
    </ResumeSettingsGroup>

    <ResumeSettingsGroup title="明暗" hint="与配色预设正交">
      <div class="resume-btn-group">
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
    </ResumeSettingsGroup>

    <ResumeSettingsGroup
      title="调色盘"
      :hint="isCustomTheme ? '浅色 / 深色各一套，可逐项改' : '预设只读；切到「自定义」后可编辑'"
    >
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
    </ResumeSettingsGroup>

    <ResumeSettingsGroup title="背景">
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
    </ResumeSettingsGroup>
  </div>
</template>
