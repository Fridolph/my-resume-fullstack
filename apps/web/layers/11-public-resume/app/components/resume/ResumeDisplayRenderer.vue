<script setup lang="ts">
import type { ResumeColumn, ResumeContent, ResumeDisplayConfig, ResumeSectionKey } from '../../types/resume'
import { resumeSectionComponents, resumeSectionDefinitions } from '../../config/resume-sections'

/**
 * 展示渲染器。
 *
 * 它**不认识任何具体区块**：顺序、显隐、分栏都来自配置与注册表，
 * 想加区块只需在 `config/resume-sections.ts` 登记 + 写组件。
 */
const props = defineProps<{
  content: ResumeContent
  config: ResumeDisplayConfig
}>()

function definitionOf(key: ResumeSectionKey) {
  return resumeSectionDefinitions.find((item) => item.key === key)
}

function columnOf(key: ResumeSectionKey): ResumeColumn {
  return definitionOf(key)?.column ?? 'main'
}

/** 最终顺序 = 配置顺序 + 未列出的按默认顺序补齐，再过滤隐藏项 */
const orderedKeys = computed(() => {
  const configured = props.config.order.filter((key) => definitionOf(key))
  const rest = resumeSectionDefinitions
    .filter((item) => !configured.includes(item.key))
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((item) => item.key)

  return [...configured, ...rest].filter((key) => !props.config.hidden.includes(key))
})

const sideKeys = computed(() => orderedKeys.value.filter((key) => columnOf(key) === 'side'))
const mainKeys = computed(() => orderedKeys.value.filter((key) => columnOf(key) === 'main'))

/** 主题 → CSS 变量：区块组件只消费变量，不关心深浅主题 */
const themeVars = computed(() => {
  const { theme } = props.config

  return {
    '--resume-primary': theme.primary,
    '--resume-gradient-from': theme.gradientFrom,
    '--resume-gradient-to': theme.gradientTo,
    '--resume-page': theme.dark ? 'rgb(3 7 18)' : 'rgb(248 250 252)',
    '--resume-surface': theme.dark ? 'rgb(17 24 39)' : 'rgb(255 255 255)',
    '--resume-border': theme.dark ? 'rgb(31 41 55)' : 'rgb(226 232 240)',
    '--resume-text': theme.dark ? 'rgb(229 231 235)' : 'rgb(15 23 42)',
    '--resume-muted': theme.dark ? 'rgb(148 163 184)' : 'rgb(100 116 139)',
    '--resume-chip-bg': theme.dark ? 'rgb(31 41 55)' : 'rgb(241 245 249)',
    '--resume-chip-text': theme.dark ? 'rgb(226 232 240)' : 'rgb(51 65 85)',
  }
})

const sidebarClass = computed(() =>
  props.config.sidebarWidth === 'wide'
    ? 'lg:grid-cols-[360px_minmax(0,1fr)]'
    : 'lg:grid-cols-[280px_minmax(0,1fr)]',
)
</script>

<template>
  <div class="min-h-screen py-8 sm:py-10" :style="{ ...themeVars, background: 'var(--resume-page)' }">
    <div class="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6" :class="sidebarClass">
      <aside
        v-if="sideKeys.length"
        class="grid gap-6"
        :class="config.stickySidebar ? 'lg:sticky lg:top-6 lg:self-start' : ''"
      >
        <component
          :is="resumeSectionComponents[key]"
          v-for="key in sideKeys"
          :key="key"
          :section="definitionOf(key)!"
          :content="content"
          :options="config.options"
          :theme="config.theme"
        />
      </aside>

      <div class="grid gap-6">
        <component
          :is="resumeSectionComponents[key]"
          v-for="key in mainKeys"
          :key="key"
          :section="definitionOf(key)!"
          :content="content"
          :options="config.options"
          :theme="config.theme"
        />
      </div>
    </div>
  </div>
</template>
