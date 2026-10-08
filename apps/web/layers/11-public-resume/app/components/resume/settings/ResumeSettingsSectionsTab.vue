<script setup lang="ts">
import type { ResumeSectionKey } from '#layers/public-resume/app/types/resume'
import { resumeSectionDefinitions } from '#layers/public-resume/app/config/resume-sections'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeSettingsGroup from './ResumeSettingsGroup.vue'

/**
 * 展示设置 · 「区块显隐」tab。
 *
 * 用**列表 + 开关**而不是按钮串：显隐本身就是开关语义，一行一个区块更易读；
 * 顺序与栏位归属不在这里（由页面上的拖拽决定）。
 */
const { config, toggleSection } = useResumeDisplay()

function isVisible(key: ResumeSectionKey) {
  return !config.value.sections.hidden.includes(key)
}
</script>

<template>
  <ResumeSettingsGroup title="区块显隐" hint="顺序与栏位归属在页面上拖拽调整">
    <ul class="grid gap-1">
      <li
        v-for="definition in resumeSectionDefinitions"
        :key="definition.key"
        class="flex items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5"
        :style="{ borderColor: 'var(--resume-border)' }"
      >
        <span class="flex min-w-0 items-center gap-2">
          <UIcon :name="definition.icon" class="resume-accent size-4 shrink-0" />
          <span class="resume-text truncate text-sm">{{ definition.label }}</span>
        </span>

        <USwitch
          size="xs"
          :model-value="isVisible(definition.key)"
          :aria-label="`显示「${definition.label}」`"
          @update:model-value="toggleSection(definition.key)"
        />
      </li>
    </ul>
  </ResumeSettingsGroup>
</template>
