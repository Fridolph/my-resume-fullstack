<script setup lang="ts">
import type { ResumeSwitchOption } from '~/composables/useResumeLayout'

/**
 * ResumeSwitchPanel —— 通用开关列表面板（合并 greensketch 的 SensitiveDataPanel / PageExportPanel）。
 * 用 `options` 描述每行：label + switchKey + 可选 inverted / hint。
 */
defineProps<{
  width: number
  title: string
  getSwitch: (key?: string) => number
  options: ResumeSwitchOption[]
}>()

const emit = defineEmits<{
  toggle: [key: string]
}>()

function checked(opt: ResumeSwitchOption, getSwitch: (key?: string) => number) {
  const v = !!getSwitch(opt.switchKey)
  return opt.inverted ? !v : v
}
</script>

<template>
  <aside class="flex h-full flex-col bg-default" :style="{ width: `${width}px` }">
    <div class="shrink-0 border-b border-default px-4 pb-2 pt-4">
      <h3 class="text-sm font-semibold text-highlighted">{{ title }}</h3>
    </div>

    <div class="flex flex-col overflow-y-auto p-4">
      <div
        v-for="opt in options"
        :key="opt.switchKey"
        class="flex items-center justify-between gap-3 border-b border-default py-3 last:border-b-0"
      >
        <div class="min-w-0">
          <p class="text-sm">{{ opt.label }}</p>
          <p v-if="opt.hint" class="mt-0.5 text-xs text-muted">{{ opt.hint }}</p>
        </div>
        <USwitch
          :model-value="checked(opt, getSwitch)"
          @update:model-value="emit('toggle', opt.switchKey)"
        />
      </div>
    </div>
  </aside>
</template>
