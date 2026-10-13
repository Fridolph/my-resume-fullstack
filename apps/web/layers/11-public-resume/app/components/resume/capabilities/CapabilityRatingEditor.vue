<script setup lang="ts">
import { changeCapabilityScale, type CapabilityData, type CapabilityView } from '@rs/common'
import { useResumeReorder } from '#layers/public-resume/app/composables/useResumeReorder'
const data = defineModel<CapabilityData>('data', { required: true })
const view = defineModel<CapabilityView>('view', { required: true })
const nextMax = ref<5 | 10 | 100>(data.value.ratingScale.max)
function syncOrder() {
  view.value.dimensionIds = data.value.dimensions
    .filter(item => view.value.dimensionIds.includes(item.id))
    .map(item => item.id)
}
const { container, handleClass } = useResumeReorder(
  () => data.value.dimensions,
  dimensions => {
    data.value.dimensions = dimensions
    syncOrder()
  },
)
function setScore(index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value
  data.value.dimensions[index]!.score = value === '' ? null : Number(value)
}
function remove(index: number) {
  const [removed] = data.value.dimensions.splice(index, 1)
  view.value.dimensionIds = view.value.dimensionIds.filter(id => id !== removed?.id)
}
function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= data.value.dimensions.length) return
  const [item] = data.value.dimensions.splice(index, 1)
  data.value.dimensions.splice(target, 0, item!)
  syncOrder()
}
function add() {
  const id = crypto.randomUUID()
  data.value.dimensions.push({ id, label: '新维度', score: null })
  view.value.dimensionIds.push(id)
}
</script>

<template>
  <fieldset class="space-y-4 rounded-xl border p-4">
    <legend class="px-2 font-semibold">展示与自评</legend>
    <label class="grid gap-1 text-sm"
      >展示方式<select v-model="view.view" class="rounded border p-2">
        <option value="text">文字概览</option>
        <option value="bar">条状图</option>
        <option value="radar">雷达图</option>
      </select></label
    >
    <label class="grid gap-1 text-sm"
      >每组预览条目数<input
        v-model.number="view.previewItemCount"
        type="number"
        min="1"
        max="5"
        class="rounded border p-2"
    /></label>
    <label class="grid gap-1 text-sm"
      >自评依据<textarea
        v-model="data.ratingScale.basis"
        maxlength="1000"
        class="rounded border p-2"
        placeholder="例如：独立交付经验、实践深度"
      />
    </label>
    <div class="flex flex-wrap items-center gap-2">
      <label
        >量尺
        <select v-model="nextMax" class="rounded border p-2">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="100">100</option>
        </select></label
      ><UButton
        label="换算已有评分"
        color="neutral"
        variant="outline"
        @click="data = changeCapabilityScale(data, nextMax, 'convert')"
      /><UButton
        label="清空评分并换量尺"
        color="neutral"
        variant="outline"
        @click="data = changeCapabilityScale(data, nextMax, 'clear')"
      />
    </div>
    <p class="text-xs text-muted">评分由你自行填写；留空表示未评分，0 是有效评分。</p>
    <div ref="container" class="space-y-3">
      <fieldset
        v-for="(dimension, index) in data.dimensions"
        :key="dimension.id"
        :data-order-id="dimension.id"
        class="grid gap-2 rounded border p-3"
      >
        <legend class="text-xs">维度 {{ index + 1 }}</legend>
        <button
          type="button"
          :class="handleClass"
          class="cursor-grab text-left text-xs"
          :aria-label="`拖拽维度 ${dimension.label}`"
        >
          ⠿ 拖拽维度
        </button>
        <label class="grid text-sm"
          >名称<input v-model="dimension.label" maxlength="80" class="rounded border p-2"
        /></label>
        <label class="grid text-sm"
          >关联能力组<select
            :value="dimension.groupId ?? ''"
            class="rounded border p-2"
            @change="dimension.groupId = ($event.target as HTMLSelectElement).value || undefined"
          >
            <option value="">独立维度</option>
            <option v-for="group in data.groups" :key="group.id" :value="group.id">{{ group.title }}</option>
          </select></label
        >
        <label class="grid text-sm"
          >评分<input
            :value="dimension.score ?? ''"
            type="number"
            min="0"
            :max="data.ratingScale.max"
            step="0.01"
            placeholder="未评分"
            class="rounded border p-2"
            @input="setScore(index, $event)"
        /></label>
        <label class="grid text-sm"
          >评分说明<textarea v-model="dimension.description" maxlength="500" class="rounded border p-2" />
        </label>
        <label class="flex gap-2 text-sm"
          ><input
            v-model="view.dimensionIds"
            type="checkbox"
            :value="dimension.id"
            @change="syncOrder"
          />展示该维度</label
        >
        <div class="flex flex-wrap gap-2">
          <UButton
            label="上移维度"
            color="neutral"
            variant="outline"
            :disabled="index === 0"
            @click="move(index, -1)"
          /><UButton
            label="下移维度"
            color="neutral"
            variant="outline"
            :disabled="index === data.dimensions.length - 1"
            @click="move(index, 1)"
          /><UButton label="删除维度" color="error" variant="ghost" @click="remove(index)" />
        </div>
      </fieldset>
    </div>
    <UButton label="添加自评维度" variant="outline" :disabled="data.dimensions.length >= 20" @click="add" />
  </fieldset>
</template>
