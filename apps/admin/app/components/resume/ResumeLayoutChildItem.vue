<script setup lang="ts">
import type { ResumeSectionChild } from '~/composables/useResumeLayout'

/**
 * ResumeLayoutChildItem —— 布局面板里的子模块行（可递归嵌套）。
 * 参考 greensketch proposal/layout/PageLayoutChildItem。
 */
const props = defineProps<{
  child: ResumeSectionChild
  /** 1 = 模块的直接子项；每嵌套一层 +1 */
  depth: number
  getSwitch: (key?: string) => number
}>()

const emit = defineEmits<{
  toggle: [key: string]
  action: [key: string]
}>()

const paddingLeft = computed(() => `${props.depth + 1}rem`)

const visible = computed(() => (props.child.switchKey ? !!props.getSwitch(props.child.switchKey) : true))

function toggleSwitch(key?: string) {
  if (!key) return
  emit('toggle', key)
}
</script>

<template>
  <div>
    <div
      class="group flex h-10 items-center gap-2 rounded-md px-2 hover:bg-primary/8 hover:text-primary"
      :style="{ paddingLeft }"
    >
      <UIcon name="i-lucide-corner-down-right" class="size-4 shrink-0 text-muted" />

      <span class="min-w-0 flex-1 truncate text-sm">{{ child.label }}</span>

      <UButton
        v-if="child.actionKey"
        icon="i-lucide-settings-2"
        variant="link"
        color="primary"
        size="xs"
        class="opacity-0 group-hover:opacity-100"
        @click.stop="emit('action', child.actionKey!)"
      />

      <UButton
        v-if="child.switchKey"
        :icon="visible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
        variant="link"
        color="primary"
        size="xs"
        @click="toggleSwitch(child.switchKey)"
      />
    </div>

    <template v-if="child.children?.length">
      <ResumeLayoutChildItem
        v-for="grandChild in child.children"
        :key="grandChild.id"
        :child="grandChild"
        :depth="depth + 1"
        :get-switch="getSwitch"
        @toggle="emit('toggle', $event)"
        @action="emit('action', $event)"
      />
    </template>
  </div>
</template>
