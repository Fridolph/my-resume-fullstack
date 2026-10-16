<script setup lang="ts">
import type { ResumeDocument } from '@rs/common'
import { useResumeReorder } from '#layers/public-resume/app/composables/useResumeReorder'
const document = defineModel<ResumeDocument>({ required: true })
const emit = defineEmits<{
  /** 打开某个区块的编辑界面（目前只有能力模块与自定义模块有） */
  edit: [id: string]
  /** 新增一条自定义模块 */
  add: []
  /** 删除一条自定义模块（**预设模块不提供删除**，这里也不渲染） */
  remove: [id: string]
}>()

/** 预设模块不可删：只有自定义模块渲染删除入口（规则由界面保证，见 DAO-037） */
function isCustom(section: { type: string }) {
  return section.type === 'custom'
}

/** 有编辑界面的区块类型 */
function canEdit(section: { type: string }) {
  return section.type === 'custom' || section.type === 'capabilities'
}
const ordered = computed(() =>
  document.value.display.sections.order.flatMap(id =>
    document.value.content.sections.filter(section => section.id === id),
  ),
)
const { container, handleClass } = useResumeReorder(
  () => ordered.value,
  sections => {
    document.value.display.sections.order = sections.map(section => section.id)
  },
)
function move(index: number, delta: number) {
  const order = document.value.display.sections.order
  const target = index + delta
  if (target < 0 || target >= order.length) return
  const [id] = order.splice(index, 1)
  order.splice(target, 0, id!)
}
function toggle(id: string) {
  const hidden = document.value.display.sections.hidden
  const index = hidden.indexOf(id)
  if (index < 0) hidden.push(id)
  else hidden.splice(index, 1)
}
</script>

<template>
  <section class="space-y-3 rounded-xl border p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-semibold">模块编排</h2>
      <UButton icon="i-lucide-plus" size="sm" variant="soft" label="添加自定义模块" @click="emit('add')" />
    </div>
    <div class="flex flex-wrap gap-3">
      <label class="grid gap-1 text-sm"
        >布局<select v-model="document.display.layout.mode" class="rounded border p-2">
          <option value="single">单栏</option>
          <option value="split">双栏</option>
          <option value="threeColumn">三栏</option>
        </select></label
      ><label v-if="document.display.layout.mode === 'split'" class="grid gap-1 text-sm"
        >信息栏位置<select v-model="document.display.layout.splitSide" class="rounded border p-2">
          <option value="left">左侧</option>
          <option value="right">右侧</option>
        </select></label
      >
    </div>
    <div ref="container" class="grid gap-2">
      <div
        v-for="(section, index) in ordered"
        :key="section.id"
        :data-order-id="section.id"
        class="flex flex-wrap items-center gap-2 rounded border p-2"
      >
        <button type="button" :class="handleClass" class="cursor-grab px-2" :aria-label="`拖拽模块 ${section.title}`">
          ⠿
        </button>
        <span class="mr-auto text-sm">{{ section.title }}</span>
        <label class="text-xs"
          >栏位
          <select v-model="document.display.sections.slot[section.id]" class="rounded border p-1">
            <option value="side">信息栏</option>
            <option value="main">主栏</option>
            <option value="rail">补充栏</option>
          </select></label
        >
        <UButton label="上移" color="neutral" variant="ghost" :disabled="index === 0" @click="move(index, -1)" />
        <UButton
          label="下移"
          color="neutral"
          variant="ghost"
          :disabled="index === ordered.length - 1"
          @click="move(index, 1)"
        />
        <UButton
          :label="document.display.sections.hidden.includes(section.id) ? '显示' : '隐藏'"
          color="neutral"
          variant="ghost"
          @click="toggle(section.id)"
        />
        <UButton
          v-if="canEdit(section)"
          :label="isCustom(section) ? '编辑' : '编辑能力'"
          size="sm"
          color="neutral"
          variant="soft"
          @click="emit('edit', section.id)"
        />
        <UButton
          v-if="isCustom(section)"
          label="删除"
          size="sm"
          color="error"
          variant="ghost"
          @click="emit('remove', section.id)"
        />
      </div>
    </div>
  </section>
</template>
