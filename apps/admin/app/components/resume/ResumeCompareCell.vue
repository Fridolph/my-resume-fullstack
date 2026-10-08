<script setup lang="ts">
/**
 * ResumeCompareCell —— 对比表格中的单个单元格（参考 greensketch OptionCompareCell）。
 * `best` 为 true 时用渐变文字 + 奖杯图标高亮。
 */
withDefaults(
  defineProps<{
    name: string
    value: string
    best?: boolean
    subtext?: string
  }>(),
  {
    best: false,
    subtext: '',
  },
)
</script>

<template>
  <div class="flex min-h-14 flex-col justify-center gap-0.5">
    <p class="text-xs text-muted">{{ name }}</p>
    <p class="flex items-center gap-1.5 text-sm" :class="best ? 'compare-best' : 'text-highlighted'">
      {{ value }}
      <UIcon v-if="best" name="i-lucide-trophy" class="size-4 shrink-0" />
    </p>
    <p v-if="subtext" class="text-xs text-muted">{{ subtext }}</p>
  </div>
</template>

<style scoped>
.compare-best {
  display: inline-flex;
  width: fit-content;
  font-weight: 600;
  background-image: linear-gradient(to right, #3ec064, #1578d0);
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
}
</style>
