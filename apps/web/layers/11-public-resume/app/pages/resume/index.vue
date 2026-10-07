<script setup lang="ts">
import ResumeAdminLoginModal from '../../components/resume/ResumeAdminLoginModal.vue'
import ResumePageContainer from '../../components/resume/ResumePageContainer.vue'
import ResumePageHeader from '../../components/resume/ResumePageHeader.vue'
import ResumeSettingsPanel from '../../components/resume/ResumeSettingsPanel.vue'
import { useResumeAdmin } from '../../composables/useResumeAdmin'
import { useResumeDisplay } from '../../composables/useResumeDisplay'
import { resumeContentMockZh } from '../../mock/resume-content.zh'

/**
 * 公开简历页 —— 只做编排。
 *
 * 结构：顶栏（含设置面板与编辑操作）+ 正文容器。
 * 布局 / 主题 / 背景 / 编排都由 `config` 决定；管理员登录后进入编辑态（可拖拽排序）。
 */
definePageMeta({
  title: '公开简历',
})

const content = resumeContentMockZh

const {
  config,
  settingsOpen,
  editable,
  isDirty,
  toggleSettings,
  toggleSection,
  saveLocal,
  reset,
  setEditable,
  loadLocal,
} = useResumeDisplay()

const { session, isAdmin, signOut, restore } = useResumeAdmin()
const loginOpen = ref(false)

// 登录态与已保存配置都在客户端恢复：SSR 不渲染编辑态，避免水合不一致
onMounted(() => {
  restore()
  loadLocal()
})

watch(isAdmin, (value) => setEditable(value), { immediate: true })
</script>

<template>
  <div>
    <ResumePageHeader
      :title="`${content.profile.name} · 简历公开页`"
      :subtitle="editable ? '编辑模式：拖拽手柄可调整区块顺序与栏位' : '内容 / 布局 / 主题三分；当前为 mock 数据'"
    >
      <template #actions>
        <template v-if="isAdmin">
          <UBadge color="success" variant="subtle" :label="`编辑模式 · ${session?.username}`" />
          <UButton
            v-if="isDirty"
            size="xs"
            color="warning"
            variant="subtle"
            label="未保存"
          />
          <UButton size="xs" icon="i-lucide-save" label="保存" @click="saveLocal" />
          <UButton size="xs" color="neutral" variant="ghost" label="重置" @click="reset" />
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
    />

    <ResumeAdminLoginModal v-model:open="loginOpen" />
  </div>
</template>
