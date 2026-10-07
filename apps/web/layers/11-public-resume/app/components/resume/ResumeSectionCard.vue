<script setup lang="ts">
/**
 * 区块外壳：统一「标题行 + 卡片表面」。
 *
 * 所有 section 组件都用它包内容，因此标题样式、间距、主题色都只有一处定义；
 * 换主题只改 CSS 变量，组件不需要知道具体颜色。
 */
withDefaults(
  defineProps<{
    section: { key: string; label: string; icon: string }
    /** 是否展示标题行（左侧信息栏的 profile 卡片用自己的排版） */
    showHeader?: boolean
  }>(),
  { showHeader: true },
)
</script>

<template>
  <section
    class="rounded-2xl border p-5"
    :style="{ background: 'var(--resume-surface)', borderColor: 'var(--resume-border)' }"
  >
    <header v-if="showHeader" class="mb-3 flex items-center gap-2">
      <UIcon :name="section.icon" class="size-4" :style="{ color: 'var(--resume-primary)' }" />
      <h2 class="text-sm font-semibold tracking-tight" :style="{ color: 'var(--resume-primary)' }">
        {{ section.label }}
      </h2>
    </header>
    <div class="space-y-3 text-sm leading-6" :style="{ color: 'var(--resume-text)' }">
      <slot />
    </div>
  </section>
</template>
