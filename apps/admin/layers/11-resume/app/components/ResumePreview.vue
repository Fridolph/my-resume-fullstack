<script setup lang="ts">
import {
  getSectionDefinition,
  toResumeContent,
  toResumeDisplayConfig,
  type ResumeDocument,
  type ResumeSectionKey,
} from '@rs/common'
import { resumeSectionComponents } from '#layers/ui/app/config/resume-section-components'
import { useResumeLayout } from '#layers/ui/app/composables/useResumeLayout'

/**
 * 简历**只读预览**（admin 详情页用）。
 *
 * 它把"文档"喂给共享的展示组件：`toResumeContent` 转内容、`toResumeDisplayConfig` 转展示配置、
 * `useResumeLayout` 算三栏排布、`resumeSectionComponents` 按区块 key 找组件 —— 这些都在
 * `@rs/common` 与 `packages/ui`，与公开站是**同一套**（这正是展示层上提的目的）。
 *
 * 与公开站的区别只有两点：不拖拽（排布传 `false`）、不注入文档主题的 CSS 变量（见文件尾的限制说明）。
 *
 * ⚠️ 已知限制：
 * 1. 主题变量未按文档注入 —— 目前用 `resume.css` 的默认值，与文档里配置的配色可能不一致；
 * 2. 契约的 `display.sections.overrides`（能力模块指定的展示视图）暂未搬运，能力模块用默认视图。
 * 两者都记在 `dao/tasks/DAO-034` 的未验证边界里。
 */
const props = defineProps<{ document: ResumeDocument }>()

const content = computed(() => toResumeContent(props.document))
const config = computed(() => toResumeDisplayConfig(props.document))

/** 只读：`editable=false`，空栏不渲染（与公开站一致） */
const { columns, showsSlot, gridClass, columnClass } = useResumeLayout(config, false)

const SLOT_ORDER = ['side', 'main', 'rail'] as const

/** 每个区块组件要的 `section` 形状（key / label / icon）来自注册表的定义 */
function sectionOf(key: ResumeSectionKey) {
  const definition = getSectionDefinition(key)

  return { key, label: definition?.label ?? key, icon: definition?.icon ?? 'i-lucide-file-text' }
}
</script>

<template>
  <div
    class="relative overflow-hidden rounded-xl border border-default"
    :data-resume-style="config.style.id"
    :style="{ background: 'var(--resume-page)' }"
  >
    <ResumeBackgroundLayer :background="config.background" :dark="config.theme.mode === 'dark'" />

    <div class="content-max relative grid grid-cols-1 gap-6 px-4 py-8 sm:px-6" :class="gridClass">
      <template v-for="slot in SLOT_ORDER" :key="slot">
        <div v-if="showsSlot(slot)" class="space-y-6" :class="columnClass(slot)">
          <component
            :is="resumeSectionComponents[key]"
            v-for="key in columns[slot]"
            :key="key"
            :section="sectionOf(key)"
            :content="content"
            :options="config.options"
            :theme="config.theme"
            :variant="config.style.id"
          />
        </div>
      </template>
    </div>
  </div>
</template>
