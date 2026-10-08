<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { colors } from '~/components/TextEditor/contants'

const props = defineProps<{
  editor: Editor
  disabled?: boolean
}>()

const open = shallowRef(false)
function handleSelectColor(color: string) {
  open.value = false
  props.editor.commands.setBackgroundColor(color)
}
function handleClearColor() {
  open.value = false
  props.editor.commands.unsetBackgroundColor()
}
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'p-0.5' }">
    <UTooltip text="Background color" :content="{ side: 'top' }" :delay-duration="0" :disabled="disabled">
      <UButton
        icon="i-lucide-highlighter"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
        :disabled="disabled"
      />
    </UTooltip>
    <template #content>
      <UButton
        v-for="color in colors"
        :key="color"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="xs"
        class="mx-0.5 p-1"
        @click="handleSelectColor(color)"
      >
        <i class="color-box" :style="{ '--color': color }" />
      </UButton>
      <USeparator orientation="vertical" class="mx-1 inline-flex h-4" />
      <UButton
        icon="i-lucide-ban"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="xs"
        class="mr-0.5 p-1"
        @click="handleClearColor"
      />
    </template>
  </UPopover>
</template>

<style scoped>
.color-box {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--color);
}
</style>
