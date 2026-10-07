<script setup lang="ts">
import ResumePageContainer from '../../components/resume/ResumePageContainer.vue'
import ResumePageHeader from '../../components/resume/ResumePageHeader.vue'
import ResumeSettingsPanel from '../../components/resume/ResumeSettingsPanel.vue'
import { useResumeDisplay } from '../../composables/useResumeDisplay'
import { resumeContentMockZh } from '../../mock/resume-content.zh'

/**
 * 公开简历页 —— 只做编排。
 *
 * 结构一眼可读：顶栏（含设置面板）+ 正文容器。
 * 布局怎么排、主题什么风格、背景衬什么，全部由 `config` 决定（见 useResumeDisplay）。
 */
definePageMeta({
  title: '公开简历',
})

const content = resumeContentMockZh
const { config, settingsOpen, isDirty, toggleSettings, saveLocal } = useResumeDisplay()
</script>

<template>
  <div>
    <ResumePageHeader
      :title="`${content.profile.name} · 简历公开页`"
      subtitle="内容 / 布局 / 主题三分；当前为 mock 数据"
    >
      <template #actions>
        <UBadge v-if="isDirty" color="warning" variant="subtle" label="未保存" />
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          icon="i-lucide-save"
          label="保存"
          @click="saveLocal"
        />
        <UButton
          size="xs"
          color="neutral"
          :variant="settingsOpen ? 'soft' : 'outline'"
          :icon="settingsOpen ? 'i-lucide-x' : 'i-lucide-sliders-horizontal'"
          :label="settingsOpen ? '收起设置' : '展示设置'"
          @click="toggleSettings"
        />
      </template>

      <ResumeSettingsPanel v-if="settingsOpen" />
    </ResumePageHeader>

    <ResumePageContainer :content="content" :config="config" />
  </div>
</template>
