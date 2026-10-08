<script setup lang="ts">
import type { Resume } from "~/config/resume-demo";

/**
 * ResumeCompareRow —— 对比弹窗里的一行数据（参考 greensketch OptionCompareItem）。
 * 每个可见 option 渲染一个 ResumeCompareCell（字段名 + 值 + 最优高亮）。
 */
defineProps<{
  label: string | ((opt: Resume) => string);
  options: Resume[];
  showOptionIndex: number[];
  valueOf: (opt: Resume) => string;
  subtextOf?: (opt: Resume) => string;
  bestOf?: (opt: Resume) => boolean;
}>();
</script>

<template>
  <div class="flex items-stretch gap-4 border-b border-default py-3">
    <div v-for="idx in showOptionIndex" :key="options[idx]!.id" class="min-w-0 flex-1">
      <ResumeCompareCell
        :name="typeof label === 'function' ? label(options[idx]!) : label"
        :value="valueOf(options[idx]!)"
        :subtext="subtextOf ? subtextOf(options[idx]!) : ''"
        :best="bestOf ? bestOf(options[idx]!) : false"
      />
    </div>
  </div>
</template>
