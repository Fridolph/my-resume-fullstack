<script setup lang="ts">
import type { ResumeStyleId } from '@rs/common'

/**
 * 区块外壳：统一「标题行 + 卡片表面」。
 *
 * 所有 section 组件都用它包内容，因此标题结构、间距、表面样式只有一处定义。
 *
 * 风格分两层落地（见 docs/web/07_简历风格_三档实现.md）：
 * - **视觉参数**（表面 / 圆角 / 内边距 / 阴影 / hover）走 `.resume-card` 与 `--resume-card-*`
 *   变量，定义在 `app/assets/css/resume.css`，本组件不重复写样式；
 * - **标题结构**差异（DOM 不同，变量表达不了）由 `variant` 决定 —— 用下面的**数据映射**表达，
 *   加一档风格只加一行，不再堆 if/else（此前是 `isStandard` 布尔，加 `pro` 就会掉进 minimal）。
 */
const props = withDefaults(
  defineProps<{
    section: { key: string; label: string; icon: string; description?: string }
    /** 是否展示标题行（左侧信息栏的 profile 卡片用自己的排版） */
    showHeader?: boolean
    /** 风格变体：只决定标题结构，其余视觉参数来自变量 */
    variant?: ResumeStyleId
  }>(),
  { showHeader: true, variant: 'minimal' },
)

/**
 * 三档标题结构。
 *
 * - `minimal`：icon + 小标题（克制）
 * - `standard`：渐变条 + 大标题（对齐旧站）
 * - `pro`：更高的色条 + 标题 + 右侧渐隐细线（层级更讲究）
 */
const HEADER_STYLE: Record<
  ResumeStyleId,
  {
    wrapper: string
    /** 左侧渐变条的高度/宽度类；`null` 表示不画 */
    bar: string | null
    titleClass: string
    /** 是否在标题右侧补一条渐隐细线 */
    rule: boolean
  }
> = {
  minimal: {
    wrapper: 'mb-3 flex items-center gap-2',
    bar: null,
    titleClass: 'resume-accent',
    rule: false,
  },
  standard: {
    wrapper: 'mb-4 flex items-center gap-3',
    bar: 'h-5 w-1',
    titleClass: 'resume-text',
    rule: false,
  },
  pro: {
    wrapper: 'mb-4 flex items-center gap-3',
    bar: 'h-6 w-1.5',
    titleClass: 'resume-text',
    rule: true,
  },
}

const header = computed(() => HEADER_STYLE[props.variant])
</script>

<template>
  <section class="resume-card" :data-style="variant">
    <header v-if="showHeader" :class="header.wrapper">
      <!-- 左侧渐变条：standard / pro 有，且 pro 更高 -->
      <span
        v-if="header.bar"
        aria-hidden="true"
        class="shrink-0 rounded-full"
        :class="header.bar"
        :style="{
          background: 'linear-gradient(180deg, var(--resume-gradient-from), var(--resume-gradient-to))',
        }"
      />
      <UIcon :name="section.icon" class="resume-accent size-4 shrink-0" />
      <h2 class="resume-title font-semibold tracking-tight" :class="header.titleClass">
        {{ section.label }}
      </h2>
      <!-- pro：标题右侧渐隐细线，把标题行与内容拉出层级 -->
      <span
        v-if="header.rule"
        aria-hidden="true"
        class="ms-2 h-px flex-1"
        :style="{ background: 'linear-gradient(90deg, var(--resume-border), transparent)' }"
      />
    </header>
    <!-- 模块描述（自定义模块的可选字段）。
         独立于标题行之外渲染：它是「这个模块在讲什么」的一句话，属正文层级而不是标题的一部分；
         预设模块的 `description` 通常是空的，因此这里只在有值时占位。 -->
    <p v-if="section.description" class="resume-muted mb-3 text-xs leading-5">{{ section.description }}</p>
    <div class="resume-text space-y-3 text-sm leading-6">
      <slot />
    </div>
  </section>
</template>
