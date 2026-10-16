<script setup lang="ts">
/**
 * SortableBarBadge —— 序号徽标（参考 greensketch design/NumBadge，解耦业务）。
 * `active` 为绿（正常/可见），false 为灰。
 */
const {
  label,
  showChip = false,
  active = true,
  tooltipText,
} = defineProps<{
  label?: number | string
  showChip?: boolean
  active?: boolean
  tooltipText?: string
}>()

const badgeBgClass = computed(() => (active ? 'bg-[#3ec064]' : 'bg-[#9ca3af]'))
</script>

<template>
  <UTooltip :text="tooltipText">
    <UChip :show="showChip" :ui="{ base: 'bg-transparent ring-transparent' }">
      <UBadge
        color="neutral"
        :label="label"
        :ui="{
          base: `px-1 py-0 rounded-sm min-w-5 h-5 justify-center shrink-0 ${badgeBgClass}`,
          label: 'leading-normal',
        }"
      />

      <template #content>
        <UIcon name="i-lucide-zap" class="text-[#EA841E] text-[10px]" />
      </template>
    </UChip>
  </UTooltip>
</template>
