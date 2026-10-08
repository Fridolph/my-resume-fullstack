<script setup lang="ts">
import type { Component } from 'vue'
import type { ResumeSectionProps, ResumeStyleId } from '#layers/public-resume/app/types/resume'
import ResumeHeroMinimal from './hero/ResumeHeroMinimal.vue'
import ResumeHeroPro from './hero/ResumeHeroPro.vue'
import ResumeHeroStandard from './hero/ResumeHeroStandard.vue'

/**
 * 基本信息卡片 —— **入口薄壳**。
 *
 * 只做三件事：接 `ResumeSectionProps` 契约、挂统一的 `.resume-card` 外壳、
 * 按 `variant` 把渲染交给 `hero/` 下的对应实现。
 *
 * **为什么拆三档而不是在一个文件里三段 `v-if`**：
 * - hero 全站只有一处使用 → 拆开没有"改一处要同步多处"的成本；
 * - `pro` 引入了画廊 / 数字块 / 能力雷达 / 求职状态这些**结构差异较大**的呈现，
 *   三段平行模板会把单文件推到 400+ 行，可读性与 review 面都会变差；
 * - 下一期 pro 要加动效（入场 stagger / 视差），独立文件更利于它单独演进。
 *
 * 对照：`ResumeSectionCard` 走的是相反策略（外壳共用 + 标题结构分支），
 * 因为它被 7 个区块复用，抽出变体会产生同步成本。
 */
const props = defineProps<ResumeSectionProps>()

const heroVariants: Record<ResumeStyleId, Component> = {
  minimal: ResumeHeroMinimal,
  standard: ResumeHeroStandard,
  pro: ResumeHeroPro,
}

const heroComponent = computed(() => heroVariants[props.variant])
</script>

<template>
  <section class="resume-card" :data-style="variant">
    <component
      :is="heroComponent"
      :content="content"
      :options="options"
      :variant="variant"
    />
  </section>
</template>
