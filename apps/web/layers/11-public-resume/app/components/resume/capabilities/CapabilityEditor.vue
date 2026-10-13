<script setup lang="ts">
import type { CapabilitySection, CapabilityView } from '@rs/common'
import CapabilityGroupEditor from './CapabilityGroupEditor.vue'
import CapabilityRatingEditor from './CapabilityRatingEditor.vue'
import { useResumeReorder } from '#layers/public-resume/app/composables/useResumeReorder'
const section = defineModel<CapabilitySection>('section', { required: true })
const view = defineModel<CapabilityView>('view', { required: true })
const newId = () => crypto.randomUUID()
const { container, handleClass } = useResumeReorder(
  () => section.value.data.groups,
  groups => {
    section.value.data.groups = groups
  },
)
function remove(index: number) {
  const [group] = section.value.data.groups.splice(index, 1)
  section.value.data.dimensions.forEach(item => {
    if (item.groupId === group?.id) delete item.groupId
  })
}
function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= section.value.data.groups.length) return
  const [item] = section.value.data.groups.splice(index, 1)
  section.value.data.groups.splice(target, 0, item!)
}
</script>

<template>
  <div class="space-y-6">
    <label class="grid gap-1 text-sm"
      >模块标题<input v-model="section.title" maxlength="80" class="rounded border p-2"
    /></label>
    <label class="grid gap-1 text-sm"
      >模块说明<textarea v-model="section.description" maxlength="3000" class="rounded border p-2" />
    </label>
    <div ref="container" class="space-y-4">
      <fieldset
        v-for="(group, index) in section.data.groups"
        :key="group.id"
        :data-order-id="group.id"
        class="space-y-3 rounded-xl border p-4"
      >
        <legend class="px-2 font-semibold">{{ group.title }}</legend>
        <button type="button" :class="handleClass" class="cursor-grab text-xs" :aria-label="`拖拽分组 ${group.title}`">
          ⠿ 拖拽分组
        </button>
        <CapabilityGroupEditor :model-value="group" @update:model-value="section.data.groups[index] = $event" />
        <div class="flex flex-wrap gap-2">
          <UButton
            label="上移分组"
            color="neutral"
            variant="outline"
            :disabled="index === 0"
            @click="move(index, -1)"
          /><UButton
            label="下移分组"
            color="neutral"
            variant="outline"
            :disabled="index === section.data.groups.length - 1"
            @click="move(index, 1)"
          /><UButton label="删除分组" color="error" variant="ghost" @click="remove(index)" />
        </div>
      </fieldset>
    </div>
    <UButton
      label="添加能力分组"
      variant="outline"
      :disabled="section.data.groups.length >= 20"
      @click="section.data.groups.push({ id: newId(), title: '新能力分组', summary: '', items: [] })"
    />
    <CapabilityRatingEditor v-model:data="section.data" v-model:view="view" />
  </div>
</template>
