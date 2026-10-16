<script setup lang="ts">
import type { ResumeDocument, ResumeSection, ResumeSectionSummary } from '@rs/common'
import {
  resumeSectionComponents,
  getSectionDefinition,
  toLegacySectionKey,
} from '#layers/public-resume/app/config/resume-sections'
import { toResumeContent } from '#layers/public-resume/app/utils/resume-document'
import CapabilitySection from '#layers/ui/app/components/resume/CapabilitySection.vue'
import ResumeBackgroundLayer from '#layers/ui/app/components/resume/ResumeBackgroundLayer.vue'
const props = defineProps<{ document: ResumeDocument }>()

/**
 * 契约区块 → 展示层要的区块摘要（`ResumeSectionSummary`）。
 *
 * ⚠️ 不要在这里**手工拼**一个"只含 key/label/icon"的字面量：
 *   - 漏 `id` → `CustomSection` 靠 `content.custom.find(item => item.id === section.id)` 找自己那份内容，
 *     `undefined === undefined` 会让它**永远找不到**，富文本一个字符都不渲染；
 *   - 漏 `description` → 用户填的模块描述永远看不见。
 *
 * 预设模块的显示名与图标来自共享定义（用户不通过 `title` 改它）；自定义模块相反 ——
 * 用实例自己的 `title` / `description` / `icon`。这与 `@rs/common` 的 `toResumeContent` 口径一致。
 */
function sectionSummary(section: ResumeSection): ResumeSectionSummary {
  const key = toLegacySectionKey(section.type)
  const definition = getSectionDefinition(key)
  const isCustom = section.type === 'custom'

  return {
    id: section.id,
    key,
    label: isCustom ? section.title : (definition?.label ?? section.title),
    icon: isCustom ? (section.icon ?? 'i-lucide-shapes') : (definition?.icon ?? 'i-lucide-file-text'),
    description: section.description,
  }
}
const sections = computed(() =>
  props.document.display.sections.order.flatMap(id =>
    props.document.content.sections.filter(
      section => section.id === id && !props.document.display.sections.hidden.includes(id),
    ),
  ),
)
const columns = computed(() => {
  const layout = props.document.display.layout
  const slots =
    layout.mode === 'single'
      ? ['main']
      : layout.mode === 'threeColumn'
        ? ['side', 'main', 'rail']
        : layout.splitSide === 'left'
          ? ['side', 'main']
          : ['main', 'side']
  return slots.map(slot => ({
    slot,
    sections: sections.value.filter(section => {
      const assigned = props.document.display.sections.slot[section.id] ?? 'main'
      return (
        (layout.mode === 'single' ? 'main' : layout.mode === 'split' && assigned === 'rail' ? 'main' : assigned) ===
        slot
      )
    }),
  }))
})
const gridClass = computed(() =>
  props.document.display.layout.mode === 'single'
    ? ''
    : props.document.display.layout.mode === 'threeColumn'
      ? 'lg:grid-cols-[220px_minmax(0,1fr)_220px]'
      : props.document.display.layout.splitSide === 'left'
        ? 'lg:grid-cols-[280px_minmax(0,1fr)]'
        : 'lg:grid-cols-[minmax(0,1fr)_280px]',
)
/**
 * 主题 / 风格 → CSS 变量。
 *
 * ⚠️ 用 `packages/ui` 的共享实现，不要在页面里再写一份简化版：公开站、工作台预览、
 * admin 只读详情页必须是同一套观感，分叉出去必然漂移（这里原先就有一份"预览简化版"）。
 */
const variables = useResumeThemeVariables(() => props.document.display)
</script>

<template>
  <div class="relative rounded-2xl p-4 sm:p-6" :style="variables" :data-resume-style="document.display.style.id">
    <ResumeBackgroundLayer :background="document.display.background" :dark="document.display.theme.mode === 'dark'" />
    <div class="relative flex flex-col gap-6 lg:grid" :class="gridClass">
      <div v-for="column in columns" :key="column.slot" class="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
        <div
          v-for="section in column.sections"
          :key="section.id"
          class="min-w-0"
          :style="{ order: document.display.sections.order.indexOf(section.id) }"
        >
          <CapabilitySection
            v-if="section.type === 'capabilities'"
            :section="section"
            :view="
              document.display.sections.overrides[section.id]?.capabilities ?? {
                view: 'text',
                dimensionIds: [],
                previewItemCount: 3,
              }
            "
            :variant="document.display.style.id"
          />
          <component
            :is="resumeSectionComponents[toLegacySectionKey(section.type)]"
            v-else
            :section="sectionSummary(section)"
            :content="toResumeContent(document, section)"
            :options="document.display.options"
            :theme="document.display.theme"
            :variant="document.display.style.id"
          />
        </div>
      </div>
    </div>
    <footer v-if="document.content.footer.note" class="resume-muted relative mt-6 text-center text-xs">
      {{ document.content.footer.note }}
    </footer>
  </div>
</template>
