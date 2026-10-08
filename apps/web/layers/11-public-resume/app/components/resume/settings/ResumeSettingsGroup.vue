<script setup lang="ts">
/**
 * 设置项分组：统一「小标题 + 内容」的排版。
 *
 * 三个 tab 里的每个模块（布局 / 信息栏位置 / 风格 / 配色 / 调色盘 / 背景 / 区块显隐…）都用它包一层，
 * 于是"小标题字号、间距、可选说明"只在这里定义一次。
 */
withDefaults(
  defineProps<{
    title: string
    /** 标题右侧的补充说明（可选，例如"仅左右 / 三栏布局生效"） */
    hint?: string
  }>(),
  { hint: '' },
)
</script>

<template>
  <section class="settings-group">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <p class="resume-label font-semibold">{{ title }}</p>
      <span v-if="hint" class="resume-muted text-xs">{{ hint }}</span>
    </div>
    <div class="grid gap-2">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.settings-group {
  display: grid;
  gap: 0.5rem;
}
</style>
