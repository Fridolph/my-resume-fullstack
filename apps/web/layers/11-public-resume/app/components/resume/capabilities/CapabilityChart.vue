<script setup lang="ts">
import type { CapabilityData, CapabilityView } from '@rs/common'
const props = defineProps<{ data: CapabilityData; view: CapabilityView }>()
const dimensions = computed(() =>
  props.view.dimensionIds.flatMap(id => props.data.dimensions.filter(item => item.id === id)),
)
const rated = computed(() => dimensions.value.filter(item => item.score !== null))
function point(index: number, ratio: number) {
  const angle = (index * Math.PI * 2) / rated.value.length - Math.PI / 2
  return { x: 160 + Math.cos(angle) * 100 * ratio, y: 145 + Math.sin(angle) * 100 * ratio }
}
function polygon(ratio?: number) {
  return rated.value
    .map((item, index) => {
      const position = point(index, ratio ?? item.score! / props.data.ratingScale.max)
      return `${position.x},${position.y}`
    })
    .join(' ')
}
</script>

<template>
  <div v-if="view.view !== 'text'" class="space-y-4">
    <p class="resume-muted text-xs">
      个人自评 · {{ data.ratingScale.max }} 分制{{ data.ratingScale.basis ? ` · ${data.ratingScale.basis}` : '' }}
    </p>
    <svg
      v-if="view.view === 'radar' && rated.length >= 3"
      viewBox="0 0 320 290"
      class="mx-auto w-full max-w-md"
      role="img"
      aria-label="能力自评雷达图，具体分数见下方列表"
    >
      <polygon
        v-for="ratio in [0.25, 0.5, 0.75, 1]"
        :key="ratio"
        :points="polygon(ratio)"
        fill="none"
        stroke="var(--resume-border)"
      />
      <polygon
        :points="polygon()"
        fill="var(--resume-primary)"
        fill-opacity="0.18"
        stroke="var(--resume-primary)"
        stroke-width="2"
      />
      <text
        v-for="(item, index) in rated"
        :key="item.id"
        :x="point(index, 1.25).x"
        :y="point(index, 1.25).y"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="10"
        fill="currentColor"
      >
        {{ item.label.length > 10 ? `${item.label.slice(0, 9)}…` : item.label }}
      </text>
    </svg>
    <p v-else-if="view.view === 'radar'" class="resume-muted text-sm">至少为三个维度填写评分后显示雷达图。</p>
    <div v-for="item in dimensions" :key="item.id" class="space-y-1">
      <div class="flex justify-between gap-3 text-sm">
        <span>{{ item.label }}</span
        ><span>{{ item.score === null ? '未评分' : `${item.score} / ${data.ratingScale.max}` }}</span>
      </div>
      <div
        v-if="view.view === 'bar' && item.score !== null"
        class="h-2 overflow-hidden rounded-full"
        style="background: var(--resume-chip-bg)"
      >
        <div
          class="h-full rounded-full"
          :style="{ width: `${(item.score / data.ratingScale.max) * 100}%`, background: 'var(--resume-primary)' }"
        />
      </div>
      <p v-if="item.description" class="resume-muted text-xs">{{ item.description }}</p>
    </div>
    <p v-if="!dimensions.length" class="resume-muted text-sm">尚未选择自评维度。</p>
  </div>
</template>
