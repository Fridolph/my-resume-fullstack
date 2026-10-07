<script setup lang="ts">
import ResumeLoginButton from '../../components/resume/ResumeLoginButton.vue'
import ResumePageContainer from '../../components/resume/ResumePageContainer.vue'
import ResumePageHeader from '../../components/resume/ResumePageHeader.vue'
import ResumeSectionEditorDrawer from '../../components/resume/ResumeSectionEditorDrawer.vue'
import ResumeSettingsDrawer from '../../components/resume/ResumeSettingsDrawer.vue'
import { getSectionDefinition } from '../../config/resume-sections'
import { useResumeActiveSection } from '../../composables/useResumeActiveSection'
import { useResumeAdmin } from '../../composables/useResumeAdmin'
import { useResumeContent } from '../../composables/useResumeContent'
import { useResumeDisplay } from '../../composables/useResumeDisplay'
import type { ResumeSectionKey } from '../../types/resume'

/**
 * 公开简历页 —— 只做编排。
 *
 * 头部（品牌 + 滚动模块名 + 操作）· 正文容器 · 两个抽屉（设置 / 内容编辑）。
 * 操作块本身都在组件里：登录入口自带弹窗，设置自带抽屉，页面只负责开关状态。
 */
definePageMeta({
  title: '公开简历',
})

const {
  config,
  settingsOpen,
  editable,
  isDirty: displayDirty,
  toggleSection,
  saveLocal: saveDisplay,
  reset: resetDisplay,
  setEditable,
  loadLocal: loadDisplay,
} = useResumeDisplay()

const {
  content,
  dirty: contentDirty,
  saveLocal: saveContent,
  loadLocal: loadContent,
  reset: resetContent,
} = useResumeContent()

const { isAdmin, restore } = useResumeAdmin()
const { activeKey } = useResumeActiveSection()

const editorOpen = ref(false)
const editingKey = ref<ResumeSectionKey | null>(null)

const hasChanges = computed(() => displayDirty.value || contentDirty.value)

/** 品牌：优先用配置，未配置回退预设（姓名首字 / 姓名 / 定位） */
const brand = computed(() => ({
  ...config.value.brand,
  logoText:
    config.value.brand.logoText
    || content.value.profile.avatarText
    || content.value.profile.name.slice(0, 1),
  title: config.value.brand.title || content.value.profile.name,
  description: config.value.brand.description ?? content.value.profile.headline,
}))

/** 头部中区：滚动正文时显示当前模块名 */
const activeSectionTitle = computed(() =>
  activeKey.value ? getSectionDefinition(activeKey.value)?.label ?? '' : '',
)

// 登录态与已保存内容都在客户端恢复：SSR 不渲染编辑态，避免水合不一致
onMounted(() => {
  restore()
  loadDisplay()
  loadContent()
})

watch(isAdmin, (value) => setEditable(value), { immediate: true })

function openEditor(key: ResumeSectionKey) {
  editingKey.value = key
  editorOpen.value = true
}

function saveAll() {
  saveDisplay()
  saveContent()
}

function resetAll() {
  resetDisplay()
  resetContent()
}
</script>

<template>
  <div>
    <ResumePageHeader :brand="brand" :active-section-title="activeSectionTitle">
      <template #actions>
        <template v-if="isAdmin">
          <UButton v-if="hasChanges" size="xs" color="warning" variant="subtle" label="未保存" />
          <UButton size="xs" icon="i-lucide-save" label="保存" @click="saveAll" />
          <UButton size="xs" color="neutral" variant="ghost" label="重置" @click="resetAll" />
        </template>

        <ResumeLoginButton />

        <UTooltip text="展示设置">
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-sliders-horizontal"
            aria-label="展示设置"
            @click="settingsOpen = true"
          />
        </UTooltip>
      </template>
    </ResumePageHeader>

    <ResumePageContainer
      :content="content"
      :config="config"
      :editable="editable"
      @hide="toggleSection"
      @edit="openEditor"
    />

    <ResumeSettingsDrawer v-model:open="settingsOpen" />
    <ResumeSectionEditorDrawer v-model:open="editorOpen" :section-key="editingKey" />
  </div>
</template>
