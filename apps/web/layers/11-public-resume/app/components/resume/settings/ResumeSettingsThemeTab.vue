<script setup lang="ts">
import type { ResumeColorMode, ResumeThemeColorKey } from '#layers/public-resume/app/types/resume'
import {
  RESUME_CUSTOM_THEME,
  resumeBackgroundPresets,
  resumeThemeFields,
  resumeThemePresets,
} from '#layers/public-resume/app/mock/resume-display'
import { normalizeApiError } from '@rs/common'
import { createUploadApi } from '#layers/public-resume/app/apis/upload'
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

// 切换预设 / 明暗 / 背景是一档；「自定义调色盘」是更高的一档（见 config/permissions.ts）
const { canEditCustomTheme, canEditTheme, canInteractCustomTheme } = usePermission()

const toast = useToast()

/** 「自定义」比"切预设"高一档：能点但可能被拒（第三档语义） */
function onCustomThemeClick() {
  if (!canEditCustomTheme.value) {
    toast.add({
      title: '需要管理员权限',
      description: '「自定义」配色只有管理员可以编辑',
      color: 'warning',
    })
    return
  }

  applyCustomTheme()
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

// ── 背景图上传（DAO-036）───────────────────────────────────────────
// 原来这里只是一个 URL 输入框（placeholder 写着"上传后置，本轮只建模"）——
// 用户不可能自己找一个图床。现在直接传，把返回的 url 写进展示配置。
const uploadApi = createUploadApi()
const uploading = ref(false)
const uploadError = ref('')

/**
 * 选文件 → 上传 → 写回 `background.image.url`。
 *
 * 只收 png / jpeg 与「大小上限」都由服务端强制（共享层
 * `UPLOAD_ALLOWED_MIMES` / `UPLOAD_MAX_FILE_BYTES`）；这里的 `accept` 只是体验，
 * 免得用户先选一个 20MB 的图再被拒。
 */
async function onPickBackground(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许重复选同一个文件
  if (!file) return

  uploading.value = true
  uploadError.value = ''
  try {
    const uploaded = await uploadApi.upload(file, 'resume-asset')
    setBackgroundType('image')
    setBackgroundImage({ url: uploaded.url })
  } catch (problem) {
    uploadError.value = normalizeApiError(problem).message
  } finally {
    uploading.value = false
  }
}

const backgroundFileInput = ref<HTMLInputElement | null>(null)
</script>

<template>
  <div class="space-y-5">
    <ResumeSettingsGroup :locked="!canEditTheme" title="配色">
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
          :disabled="!canInteractCustomTheme"
          :label="RESUME_CUSTOM_THEME.label"
          :icon="isCustomTheme ? 'i-lucide-pipette' : undefined"
          :color="isCustomTheme ? 'primary' : 'neutral'"
          :variant="isCustomTheme ? 'solid' : 'outline'"
          @click="onCustomThemeClick"
        />
      </div>
    </ResumeSettingsGroup>

    <ResumeSettingsGroup :locked="!canEditTheme" title="明暗" hint="与配色预设正交">
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
      :locked="!canInteractCustomTheme"
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

    <ResumeSettingsGroup :locked="!canEditTheme" title="背景">
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
          placeholder="背景图 URL（也可以直接上传）"
          :model-value="config.background.image.url"
          @update:model-value="setBackgroundImage({ url: String($event) })"
        />
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref="backgroundFileInput"
            type="file"
            accept="image/png,image/jpeg"
            class="hidden"
            @change="onPickBackground"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-upload"
            :loading="uploading"
            label="上传背景图"
            @click="backgroundFileInput?.click()"
          />
          <span v-if="uploadError" class="text-xs text-error">{{ uploadError }}</span>
        </div>
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
