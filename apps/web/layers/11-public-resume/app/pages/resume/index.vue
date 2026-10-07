<script setup lang="ts">
import ResumeDisplayRenderer from '../../components/resume/ResumeDisplayRenderer.vue'
import { resumeSectionDefinitions } from '../../config/resume-sections'
import { resumeContentMockZh } from '../../mock/resume-content.zh'
import { resumeDisplayMock, resumeThemePresets } from '../../mock/resume-display'
import type { ResumeDisplayConfig, ResumeSectionKey } from '../../types/resume'

definePageMeta({
  title: '公开简历',
})

/**
 * 展示配置（mock 阶段放在前端）。
 *
 * 接后端后这份配置由公开快照携带，页面只负责把它交给渲染器；
 * 这里的「展示设置」面板仅用于在当前阶段验证「配置驱动」是否真的成立。
 */
const config = reactive<ResumeDisplayConfig>({
  ...resumeDisplayMock,
  order: [...resumeDisplayMock.order],
  hidden: [...resumeDisplayMock.hidden],
  options: { ...resumeDisplayMock.options },
  theme: { ...resumeDisplayMock.theme },
})

const showSettings = ref(false)

function isHidden(key: ResumeSectionKey) {
  return config.hidden.includes(key)
}

function toggleSection(key: ResumeSectionKey) {
  const index = config.hidden.indexOf(key)
  if (index >= 0) {
    config.hidden.splice(index, 1)
  }
  else {
    config.hidden.push(key)
  }
}

function applyTheme(id: string) {
  const preset = resumeThemePresets.find((item) => item.id === id)
  if (preset) {
    Object.assign(config.theme, preset)
  }
}

function resetConfig() {
  config.order = [...resumeDisplayMock.order]
  config.hidden = []
  config.stickySidebar = resumeDisplayMock.stickySidebar
  config.sidebarWidth = resumeDisplayMock.sidebarWidth
  Object.assign(config.options, resumeDisplayMock.options)
  Object.assign(config.theme, resumeDisplayMock.theme)
}
</script>

<template>
  <div>
    <div
      class="sticky top-0 z-10 border-b backdrop-blur"
      :style="{ borderColor: 'var(--resume-border, #e2e8f0)', background: 'color-mix(in srgb, var(--resume-surface, #fff) 88%, transparent)' }"
    >
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p class="text-sm font-medium" :style="{ color: 'var(--resume-text, #0f172a)' }">
          {{ resumeContentMockZh.profile.name }} · 简历公开页（mock 数据）
        </p>
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          :icon="showSettings ? 'i-lucide-x' : 'i-lucide-sliders-horizontal'"
          :label="showSettings ? '收起设置' : '展示设置'"
          @click="showSettings = !showSettings"
        />
      </div>

      <div v-if="showSettings" class="mx-auto w-full max-w-6xl space-y-4 px-4 pb-4 sm:px-6">
        <div class="grid gap-4 sm:grid-cols-2">
          <section class="space-y-2">
            <p class="text-xs font-medium text-muted">主题</p>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="preset in resumeThemePresets"
                :key="preset.id"
                size="xs"
                :color="config.theme.id === preset.id ? 'primary' : 'neutral'"
                :variant="config.theme.id === preset.id ? 'solid' : 'outline'"
                :label="preset.label"
                @click="applyTheme(preset.id)"
              />
            </div>
          </section>

          <section class="space-y-2">
            <p class="text-xs font-medium text-muted">布局</p>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                size="xs"
                :color="config.stickySidebar ? 'primary' : 'neutral'"
                :variant="config.stickySidebar ? 'solid' : 'outline'"
                label="左侧粘性跟随"
                @click="config.stickySidebar = !config.stickySidebar"
              />
              <UButton
                size="xs"
                :color="config.sidebarWidth === 'wide' ? 'primary' : 'neutral'"
                :variant="config.sidebarWidth === 'wide' ? 'solid' : 'outline'"
                label="放宽左栏"
                @click="config.sidebarWidth = config.sidebarWidth === 'wide' ? 'compact' : 'wide'"
              />
              <UButton size="xs" color="neutral" variant="ghost" label="重置" @click="resetConfig" />
            </div>
          </section>
        </div>

        <section class="space-y-2">
          <p class="text-xs font-medium text-muted">区块显隐（改动即时生效，顺序由配置的 order 决定）</p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="definition in resumeSectionDefinitions"
              :key="definition.key"
              size="xs"
              :icon="definition.icon"
              :color="isHidden(definition.key) ? 'neutral' : 'primary'"
              :variant="isHidden(definition.key) ? 'outline' : 'soft'"
              :label="definition.label"
              @click="toggleSection(definition.key)"
            />
          </div>
        </section>
      </div>
    </div>

    <ResumeDisplayRenderer :content="resumeContentMockZh" :config="config" />
  </div>
</template>
