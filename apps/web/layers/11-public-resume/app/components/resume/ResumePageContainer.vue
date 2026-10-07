<script setup lang="ts">
import type {
  ResumeContent,
  ResumeDisplayConfig,
  ResumeSectionKey,
  ResumeSlotKey,
} from '../../types/resume'
import { getSectionDefinition, resumeSectionDefinitions } from '../../config/resume-sections'
import ResumeBackgroundLayer from './ResumeBackgroundLayer.vue'
import ResumeColumn from './ResumeColumn.vue'

/**
 * 正文容器：布局的唯一实现处。
 *
 * - 注入主题 CSS 变量 + 背景层
 * - 把区块按「配置顺序 + 栏位归属」分到三栏
 * - 三种布局共用同一份 order / slot，切布局不丢编排
 * - `lg` 以下一律单列（移动端优先），DOM 顺序为 side → main → rail
 */
const props = defineProps<{
  content: ResumeContent
  config: ResumeDisplayConfig
}>()

/** 区块归属：配置覆盖 > 注册表默认 */
function slotOf(key: ResumeSectionKey): ResumeSlotKey {
  return props.config.sections.slot[key] ?? getSectionDefinition(key)?.defaultSlot ?? 'main'
}

/** 最终顺序 = 配置顺序 + 未列出的按默认顺序补齐，再过滤隐藏项 */
const orderedKeys = computed(() => {
  const configured = props.config.sections.order.filter((key) => getSectionDefinition(key))
  const rest = resumeSectionDefinitions
    .filter((item) => !configured.includes(item.key))
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((item) => item.key)

  return [...configured, ...rest].filter((key) => !props.config.sections.hidden.includes(key))
})

/** 按布局模式分栏：single 全并入 main；split 把 rail 并入 main */
const columns = computed(() => {
  const mode = props.config.layout.mode
  const buckets: Record<ResumeSlotKey, ResumeSectionKey[]> = { side: [], main: [], rail: [] }

  for (const key of orderedKeys.value) {
    let slot = slotOf(key)
    if (mode === 'single') {
      slot = 'main'
    }
    else if (mode === 'split' && slot === 'rail') {
      slot = 'main'
    }
    buckets[slot].push(key)
  }

  return buckets
})

/**
 * 栅格类必须是**字面量**：Tailwind 扫描源码里的静态字符串，
 * 拼接出来的类名不会生成样式。
 */
const gridClass = computed(() => {
  const { mode, splitSide, sideWidth } = props.config.layout
  const hasSide = columns.value.side.length > 0
  const hasRail = columns.value.rail.length > 0

  if (mode === 'threeColumn') {
    if (hasSide && hasRail) {
      return 'lg:grid-cols-[1fr_4fr_1fr]'
    }
    if (hasSide) {
      return 'lg:grid-cols-[1fr_4fr]'
    }
    if (hasRail) {
      return 'lg:grid-cols-[4fr_1fr]'
    }
    return 'lg:grid-cols-1'
  }

  if (mode === 'split' && hasSide) {
    const wide = sideWidth === 'wide'
    if (splitSide === 'right') {
      return wide ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'lg:grid-cols-[minmax(0,1fr)_280px]'
    }
    return wide ? 'lg:grid-cols-[360px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'
  }

  return 'lg:grid-cols-1'
})

/** 信息栏 + 三栏模式下跟随滚动；主内容列不跟随 */
function columnClass(slot: ResumeSlotKey) {
  const sticky = props.config.layout.stickySide && slot !== 'main'

  return sticky ? 'lg:sticky lg:top-20 lg:self-start' : ''
}

/** 主题 → CSS 变量：区块组件只消费变量，不关心明暗 */
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
</script>

<template>
  <div
    class="relative min-h-screen py-8 sm:py-10"
    :style="{ ...themeVars, background: 'var(--resume-page)' }"
  >
    <ResumeBackgroundLayer :background="config.background" :dark="config.theme.dark" />

    <div
      class="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6"
      :class="gridClass"
    >
      <div v-if="columns.side.length" :class="columnClass('side')">
        <ResumeColumn
          :keys="columns.side"
          :content="content"
          :options="config.options"
          :theme="config.theme"
        />
      </div>

      <div v-if="columns.main.length" :class="columnClass('main')">
        <ResumeColumn
          :keys="columns.main"
          :content="content"
          :options="config.options"
          :theme="config.theme"
        />
      </div>

      <div v-if="columns.rail.length" :class="columnClass('rail')">
        <ResumeColumn
          :keys="columns.rail"
          :content="content"
          :options="config.options"
          :theme="config.theme"
        />
      </div>
    </div>
  </div>
</template>
