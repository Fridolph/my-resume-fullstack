<script setup lang="ts">
import type { ResumeStyleId } from '#layers/public-resume/app/types/resume'

/**
 * 区块外壳：统一「标题行 + 卡片表面」。
 *
 * 所有 section 组件都用它包内容，因此标题结构、间距、表面样式只有一处定义。
 *
 * 风格分两层落地（见 docs/dev/resume-styles.md §5）：
 * - **视觉参数**走 `--resume-card-*` / `--resume-title-size` 变量（容器按风格注入），
 *   本组件只消费变量，不认识 `minimal` / `standard` 的具体配色与阴影；
 * - **标题结构**差异（minimal：icon + 小标题；standard：色条 + 大标题）由 `variant` 决定 ——
 *   这是 DOM 差异，变量表达不了。
 * - hover / transition / reduced-motion 用 scoped 样式兜住（伪类无法用变量表达）。
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
  <section
    class="r-card border"
    :data-style="variant"
    :style="{
      background: 'var(--resume-card-bg)',
      borderColor: 'var(--resume-border)',
      borderRadius: 'var(--resume-card-radius)',
      padding: 'var(--resume-card-padding)',
      boxShadow: 'var(--resume-card-shadow)',
    }"
  >
    <header v-if="showHeader" :class="isStandard ? 'mb-4 flex items-center gap-3' : 'mb-3 flex items-center gap-2'">
      <!-- standard：左侧渐变条 + 大标题 -->
      <span
        v-if="isStandard"
        aria-hidden="true"
        class="h-5 w-1 shrink-0 rounded-full"
        :style="{ background: 'linear-gradient(180deg, var(--resume-gradient-from), var(--resume-gradient-to))' }"
      />
      <UIcon :name="section.icon" class="size-4 shrink-0" :style="{ color: 'var(--resume-primary)' }" />
      <h2
        class="font-semibold tracking-tight"
        :style="{
          color: isStandard ? 'var(--resume-text)' : 'var(--resume-primary)',
          fontSize: 'var(--resume-title-size)',
        }"
      >
        {{ section.label }}
      </h2>
    </header>
    <div class="space-y-3 text-sm leading-6" :style="{ color: 'var(--resume-text)' }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.r-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.24s ease,
    border-color 0.2s ease;
}

/* hover 动效只给 standard，且只在真有 hover 能力的设备上启用 */
@media (hover: hover) {
  .r-card[data-style='standard']:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--resume-primary) 45%, transparent);
    box-shadow: var(--resume-card-shadow-hover);
  }
}

@media (prefers-reduced-motion: reduce) {
  .r-card {
    transition: none;
  }

  .r-card[data-style='standard']:hover {
    transform: none;
  }
}
</style>
