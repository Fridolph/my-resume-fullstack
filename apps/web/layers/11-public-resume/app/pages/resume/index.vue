<script setup lang="ts">
import ResumeAdminLoginModal from '../../components/resume/ResumeAdminLoginModal.vue'
import ResumePageContainer from '../../components/resume/ResumePageContainer.vue'
import ResumePageHeader from '../../components/resume/ResumePageHeader.vue'
import ResumeSectionEditorDrawer from '../../components/resume/ResumeSectionEditorDrawer.vue'
import ResumeSettingsPanel from '../../components/resume/ResumeSettingsPanel.vue'
import type { ResumeSectionKey } from '../../types/resume'
import { useResumeAdmin } from '../../composables/useResumeAdmin'
import { useResumeContent } from '../../composables/useResumeContent'
import { useResumeDisplay } from '../../composables/useResumeDisplay'

/**
 * 公开简历页 —— 只做编排。
 *
 * 顶栏（登录 / 编辑操作 + 设置面板）+ 正文容器 + 内容编辑抽屉。
 * 两套状态分工明确：`useResumeDisplay` 管呈现方式，`useResumeContent` 管领域内容。
 */
definePageMeta({
  title: '公开简历',
})

const {
  config,
  settingsOpen,
  editable,
  isDirty: displayDirty,
  toggleSettings,
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

const { session, isAdmin, signOut, restore } = useResumeAdmin()

const loginOpen = ref(false)
const editorOpen = ref(false)
const editingKey = ref<ResumeSectionKey | null>(null)

const hasChanges = computed(() => displayDirty.value || contentDirty.value)

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
    <ResumePageHeader
      :title="`${content.profile.name} · 简历公开页`"
      :subtitle="
        editable
          ? '编辑模式：拖拽手柄调整顺序与栏位，铅笔编辑内容'
          : '内容 / 布局 / 主题三分；当前为 mock 数据'
      "
    >
      <template #actions>
        <template v-if="isAdmin">
          <UBadge color="success" variant="subtle" :label="`编辑模式 · ${session?.username}`" />
          <UButton v-if="hasChanges" size="xs" color="warning" variant="subtle" label="未保存" />
          <UButton size="xs" icon="i-lucide-save" label="保存" @click="saveAll" />
          <UButton size="xs" color="neutral" variant="ghost" label="重置" @click="resetAll" />
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-log-out"
            label="退出"
            @click="signOut"
          />
        </template>

        <UButton
          v-else
          size="xs"
          color="neutral"
          variant="outline"
          icon="i-lucide-log-in"
          label="管理员登录"
          @click="loginOpen = true"
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

    <ResumePageContainer
      :content="content"
      :config="config"
      :editable="editable"
      @hide="toggleSection"
      @edit="openEditor"
    />

    <ResumeAdminLoginModal v-model:open="loginOpen" />
    <ResumeSectionEditorDrawer v-model:open="editorOpen" :section-key="editingKey" />
  </div>
</template>
