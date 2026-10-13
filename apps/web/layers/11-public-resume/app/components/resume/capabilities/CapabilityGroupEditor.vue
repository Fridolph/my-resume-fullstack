<script setup lang="ts">
import type { CapabilityGroup } from '@rs/common'
import { useResumeReorder } from '#layers/public-resume/app/composables/useResumeReorder'
const group = defineModel<CapabilityGroup>({ required: true })
const newId = () => crypto.randomUUID()
const { container, handleClass } = useResumeReorder(
  () => group.value.items,
  items => {
    group.value = { ...group.value, items }
  },
)
function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= group.value.items.length) return
  const items = [...group.value.items]
  const [item] = items.splice(index, 1)
  items.splice(target, 0, item!)
  group.value = { ...group.value, items }
}
</script>

<template>
  <div class="space-y-3">
    <label class="grid gap-1 text-sm"
      >分组名称<input v-model="group.title" maxlength="80" class="rounded border p-2"
    /></label>
    <label class="grid gap-1 text-sm"
      >一句话概述<textarea v-model="group.summary" maxlength="300" class="rounded border p-2" />
    </label>
    <div ref="container" class="space-y-3">
      <fieldset
        v-for="(item, index) in group.items"
        :key="item.id"
        :data-order-id="item.id"
        class="space-y-2 rounded border p-3"
      >
        <legend class="text-xs">能力 {{ index + 1 }}</legend>
        <button type="button" :class="handleClass" class="cursor-grab text-xs" :aria-label="`拖拽条目 ${item.name}`">
          ⠿ 拖拽条目
        </button>
        <label class="grid gap-1 text-sm"
          >名称<input v-model="item.name" maxlength="80" class="rounded border p-2"
        /></label>
        <label class="grid gap-1 text-sm"
          >实践说明<textarea v-model="item.description" maxlength="3000" class="rounded border p-2" />
        </label>
        <div v-for="(link, linkIndex) in item.evidenceLinks" :key="link.id" class="grid gap-2 sm:grid-cols-2">
          <label class="grid text-xs"
            >佐证名称<input v-model="link.label" maxlength="80" class="rounded border p-2"
          /></label>
          <label class="grid text-xs"
            >佐证网址<input v-model="link.url" type="url" placeholder="https://" class="rounded border p-2"
          /></label>
          <UButton label="删除佐证" color="neutral" variant="ghost" @click="item.evidenceLinks.splice(linkIndex, 1)" />
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            label="上移条目"
            color="neutral"
            variant="outline"
            :disabled="index === 0"
            @click="move(index, -1)"
          />
          <UButton
            label="下移条目"
            color="neutral"
            variant="outline"
            :disabled="index === group.items.length - 1"
            @click="move(index, 1)"
          />
          <UButton
            label="添加佐证"
            color="neutral"
            variant="ghost"
            :disabled="item.evidenceLinks.length >= 5"
            @click="item.evidenceLinks.push({ id: newId(), label: '实践链接', url: '' })"
          />
          <UButton label="删除条目" color="error" variant="ghost" @click="group.items.splice(index, 1)" />
        </div>
      </fieldset>
    </div>
    <UButton
      label="添加能力条目"
      variant="outline"
      :disabled="group.items.length >= 50"
      @click="group.items.push({ id: newId(), name: '新能力', description: '', evidenceLinks: [] })"
    />
  </div>
</template>
