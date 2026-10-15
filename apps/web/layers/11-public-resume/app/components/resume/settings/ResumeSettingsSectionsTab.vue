<script setup lang="ts">
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import { useResumeContent } from '#layers/public-resume/app/composables/useResumeContent'
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
// 开关按**文档清单**列（自定义模块是多实例，每个实例一个独立开关），
// 名字取清单项的 label —— 自定义模块就是用户填的 title
const { content } = useResumeContent()
const { canEditSections, canInteractSections } = usePermission()

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
    <ul class="grid gap-1">
      <li
        v-for="item in content.sections"
        :key="item.id"
        class="flex items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5"
        :style="{ borderColor: 'var(--resume-border)' }"
      >
        <span class="flex min-w-0 items-center gap-2">
          <UIcon :name="item.icon" class="resume-accent size-4 shrink-0" />
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
