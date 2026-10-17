<script setup lang="ts">
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import { PUBLIC_RESUME_DOCUMENT_KEY } from '#layers/public-resume/app/composables/usePublicResumeDocument'
import ResumeSettingsGroup from './ResumeSettingsGroup.vue'

/**
 * 展示设置 · 「区块显隐」tab —— 权限四态在这里体现得最完整（见 `docs/dev/identity-and-access.md` §2）：
 *
 * | 身份                     | 表现                                          |
 * | ------------------------ | --------------------------------------------- |
 * | 无 `Resume.Sections:view` | 整个 tab 不出现（由 `ResumeSettingsPanel` 过滤） |
 * | `view` only（游客）       | 展示 + **整组 disabled**（连点都点不动）        |
 * | `view` + `interact`（普通用户） | 展示 + **能点，但操作被拒并提示**         |
 * | `view` + `interact` + `edit`（管理员） | 正常操作                         |
 *
 * 关键取舍：**"能点但无效"不是把控件做成假的**，而是在**动作层拦截** ——
 * 无权限时不改 `model-value`，于是开关会弹回，同时给出明确提示
 * （否则用户会以为界面坏了，那比直接禁用更糟）。
 */
const { config, toggleSection } = useResumeDisplay()

/**
 * 开关按**当前文档**的模块清单列（自定义模块多实例，每个实例一个独立开关）。
 *
 * ⚠️ 这里曾经读 `useResumeContent()`（legacy mock，`sections: []`）——
 * 于是这个 tab 永远列出 0 个模块，且不报错。改为从 `provide` 拿真实文档。
 */
const document = inject(PUBLIC_RESUME_DOCUMENT_KEY, ref(null))

/** 模块清单：id 用文档里的 UUID（`toggleSection` 依赖它），名字优先用清单项标题 */
const sections = computed(() => {
  const list = document.value?.content.sections ?? []
  return list.map(section => ({
    id: section.id,
    label: section.title || SECTION_FALLBACK_LABELS[section.type] || section.type,
  }))
})
const { canEditSections, canInteractSections } = usePermission()

/** 模块没填标题时的兜底名（与编辑器里的分组标题保持同一套说法） */
const SECTION_FALLBACK_LABELS: Record<string, string> = {
  profile: '基本信息',
  highlights: '亮点',
  education: '教育经历',
  experience: '工作经历',
  projects: '项目经历',
  capabilities: '能力',
  evaluations: '评价',
  custom: '自定义模块',
}

const toast = useToast()

function isVisible(id: string) {
  return !config.value.sections.hidden.includes(id)
}

function onToggle(id: string) {
  if (!canEditSections.value) {
    toast.add({
      title: '需要管理员权限',
      description: '当前身份可以查看，但无法修改区块显隐',
      color: 'warning',
    })
    return
  }

  toggleSection(id)
}
</script>

<template>
  <ResumeSettingsGroup
    :locked="!canInteractSections"
    title="区块显隐"
    hint="顺序与栏位归属在页面上拖拽调整"
    locked-hint="需要登录"
  >
    <p v-if="!sections.length" class="resume-text text-xs opacity-70">这份简历还没有可显隐的模块。</p>

    <ul v-else class="grid gap-1">
      <li
        v-for="item in sections"
        :key="item.id"
        class="flex items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5"
        :style="{ borderColor: 'var(--resume-border)' }"
      >
        <span class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-layout-list" class="resume-accent size-4 shrink-0" />
          <span class="resume-text truncate text-sm">{{ item.label }}</span>
        </span>

        <USwitch
          size="xs"
          :model-value="isVisible(item.id)"
          :aria-label="`显示「${item.label}」`"
          @update:model-value="onToggle(item.id)"
        />
      </li>
    </ul>
  </ResumeSettingsGroup>
</template>
