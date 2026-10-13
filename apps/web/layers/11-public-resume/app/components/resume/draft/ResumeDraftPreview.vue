<script setup lang="ts">
import type { ResumeDocument, ResumeSection } from '@rs/common'
import { resumeSectionComponents, getSectionDefinition } from '#layers/public-resume/app/config/resume-sections'
import { toResumeContent } from '#layers/public-resume/app/utils/resume-document'
import CapabilitySection from '../capabilities/CapabilitySection.vue'
import ResumeBackgroundLayer from '../ResumeBackgroundLayer.vue'
const props = defineProps<{ document: ResumeDocument }>()
function keyOf(section: ResumeSection) {
  return section.type === 'capabilities' ? 'skills' : section.type
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
const variables = computed(() => {
  const display = props.document.display
  const palette = display.theme[display.theme.mode]
  return {
    '--resume-primary': palette.primary,
    '--resume-gradient-from': palette.gradientFrom,
    '--resume-gradient-to': palette.gradientTo,
    '--resume-surface': palette.surface,
    '--resume-border': palette.border,
    '--resume-text': palette.text,
    '--resume-muted': palette.muted,
    '--resume-chip-bg': palette.chipBg,
    '--resume-chip-text': palette.chipText,
    '--resume-card-radius': display.style.id === 'minimal' ? '1rem' : '1.5rem',
    '--resume-card-padding': display.style.id === 'minimal' ? '1.25rem' : '1.5rem',
    '--resume-title-size': display.style.id === 'minimal' ? '0.875rem' : '1.25rem',
    '--resume-card-bg':
      display.style.id === 'minimal'
        ? 'var(--resume-surface)'
        : 'linear-gradient(140deg, var(--resume-surface), var(--resume-chip-bg))',
    '--resume-page': display.theme.mode === 'dark' ? '#0f172a' : '#f3f6fb',
  }
})
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
            :is="resumeSectionComponents[keyOf(section)]"
            v-else
            :section="{
              ...getSectionDefinition(keyOf(section))!,
              label: section.title,
              icon: section.icon || getSectionDefinition(keyOf(section))!.icon,
            }"
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
