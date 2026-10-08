<script setup lang="ts">
import ResumeLoginButton from '#layers/public-resume/app/components/resume/ResumeLoginButton.vue'
import ResumePageContainer from '#layers/public-resume/app/components/resume/ResumePageContainer.vue'
import ResumePageHeader from '#layers/public-resume/app/components/resume/ResumePageHeader.vue'
import ResumeSectionEditorDrawer from '#layers/public-resume/app/components/resume/ResumeSectionEditorDrawer.vue'
import ResumeSettingsDrawer from '#layers/public-resume/app/components/resume/ResumeSettingsDrawer.vue'
import { getSectionDefinition } from '#layers/public-resume/app/config/resume-sections'
import { useResumeActiveSection } from '#layers/public-resume/app/composables/useResumeActiveSection'
import { useResumeAdmin } from '#layers/public-resume/app/composables/useResumeAdmin'
import { useResumeContent } from '#layers/public-resume/app/composables/useResumeContent'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import type { ResumeSectionKey } from '#layers/public-resume/app/types/resume'

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

/**
 * 主题（颜色）+ 风格（外观参数）→ CSS 变量，注入到 `<body>`。
 *
 * 为什么不挂在内容容器上：设置抽屉与登录弹窗是 **teleport 到 body** 的，
 * 只挂在容器上的变量它们解析不到 —— 控件颜色与圆角就没法跟随简历主题。
 * 变量默认值集中在 `layers/11-public-resume/app/assets/css/resume.css`。
 */
const resumeVars = computed(() => {
  const { theme, style } = config.value
  const standard = style.id === 'standard'

  return {
    // ── 主题（颜色）──
    '--resume-primary': theme.primary,
    '--resume-gradient-from': theme.gradientFrom,
    '--resume-gradient-to': theme.gradientTo,
    // 页面底色：旧站式渐变（颜色由 primary 派生，随主题变化）
    '--resume-page': [
      'radial-gradient(circle at top, color-mix(in srgb, var(--resume-primary) 14%, transparent), transparent 24%)',
      theme.dark
        ? 'linear-gradient(180deg, #020617 0%, #0f172a 100%)'
        : 'linear-gradient(180deg, color-mix(in srgb, var(--resume-primary) 3%, #f7f9fe) 0%, color-mix(in srgb, var(--resume-primary) 6%, #eef3fb) 100%)',
    ].join(', '),
    '--resume-surface': theme.dark ? 'rgb(17 24 39)' : 'rgb(255 255 255)',
    '--resume-border': theme.dark ? 'rgb(31 41 55)' : 'rgb(226 232 240)',
    '--resume-text': theme.dark ? 'rgb(229 231 235)' : 'rgb(15 23 42)',
    '--resume-muted': theme.dark ? 'rgb(148 163 184)' : 'rgb(100 116 139)',
    '--resume-chip-bg': theme.dark ? 'rgb(31 41 55)' : 'rgb(241 245 249)',
    '--resume-chip-text': theme.dark ? 'rgb(226 232 240)' : 'rgb(51 65 85)',

    // ── 风格（外观参数）──
    '--resume-card-radius': standard ? '1.5rem' : '1rem',
    '--resume-card-padding': standard ? '1.5rem' : '1.25rem',
    '--resume-title-size': standard ? '1.5rem' : '0.875rem',
    '--resume-card-bg': standard
      ? [
          'radial-gradient(circle at top left, color-mix(in srgb, var(--resume-primary) 10%, transparent), transparent 34%)',
          'radial-gradient(circle at bottom right, color-mix(in srgb, var(--resume-primary) 6%, transparent), transparent 28%)',
          'linear-gradient(180deg, color-mix(in srgb, var(--resume-surface) 88%, transparent), color-mix(in srgb, var(--resume-chip-bg) 60%, var(--resume-surface)))',
        ].join(', ')
      : 'var(--resume-surface)',
    '--resume-card-shadow': standard
      ? '0 16px 40px color-mix(in srgb, var(--resume-text) 7%, transparent)'
      : 'none',
    '--resume-card-shadow-hover': standard
      ? '0 20px 44px color-mix(in srgb, var(--resume-primary) 18%, transparent)'
      : 'none',

    // ── 让 Nuxt UI 组件（抽屉 / 弹窗 / 按钮 / 徽标）跟随简历主题 ──
    '--ui-primary': 'var(--resume-primary)',
    '--ui-radius': standard ? '0.75rem' : '0.5rem',
  }
})

useHead({
  bodyAttrs: {
    style: computed(() =>
      Object.entries(resumeVars.value)
        .map(([key, value]) => `${key}:${value}`)
        .join(';'),
    ),
  },
})

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
