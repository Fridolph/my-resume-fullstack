<script setup lang="ts">
import type { ResumeStyleId } from '#layers/public-resume/app/types/resume'

/**
 * 区块外壳：统一「标题行 + 卡片表面」。
 *
 * 所有 section 组件都用它包内容，因此标题结构、间距、表面样式只有一处定义。
 *
 * 风格分两层落地（见 docs/dev/resume-styles.md §5）：
 * - **视觉参数**（表面 / 圆角 / 内边距 / 阴影 / hover）走 `.resume-card` 与 `--resume-card-*`
 *   变量，定义在 `app/assets/css/resume.css`，本组件不重复写样式；
 * - **标题结构**差异（minimal：icon + 小标题；standard：色条 + 大标题）由 `variant` 决定 ——
 *   这是 DOM 差异，变量表达不了。
 */
const props = withDefaults(
  defineProps<{
    section: { key: string; label: string; icon: string }
    /** 是否展示标题行（左侧信息栏的 profile 卡片用自己的排版） */
    showHeader?: boolean
    /** 风格变体：只决定标题结构，其余视觉参数来自变量 */
    variant?: ResumeStyleId
  }>(),
  { showHeader: true, variant: 'minimal' },
)

const isStandard = computed(() => props.variant === 'standard')
</script>

<template>
  <section class="resume-card" :data-style="variant">
    <header v-if="showHeader" :class="isStandard ? 'mb-4 flex items-center gap-3' : 'mb-3 flex items-center gap-2'">
      <!-- standard：左侧渐变条 + 大标题 -->
      <span
        v-if="isStandard"
        aria-hidden="true"
        class="h-5 w-1 shrink-0 rounded-full"
        :style="{ background: 'linear-gradient(180deg, var(--resume-gradient-from), var(--resume-gradient-to))' }"
      />
      <UIcon :name="section.icon" class="resume-accent size-4 shrink-0" />
      <h2
        class="resume-title font-semibold tracking-tight"
        :class="isStandard ? 'resume-text' : 'resume-accent'"
      >
        {{ section.label }}
      </h2>
    </header>
    <div class="resume-text space-y-3 text-sm leading-6">
      <slot />
    </div>
  </section>
</template>
