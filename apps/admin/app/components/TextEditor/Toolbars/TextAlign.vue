<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { TextAlign } from '~/components/TextEditor/contants'

const props = defineProps<{
  editor: Editor
  disabled?: boolean
}>()

const alignLabels: Record<string, string> = {
  [TextAlign.LEFT]: 'Align left',
  [TextAlign.CENTER]: 'Align center',
  [TextAlign.RIGHT]: 'Align right',
  [TextAlign.JUSTIFY]: 'Justify',
}

const textAligns: string[] = [TextAlign.LEFT, TextAlign.CENTER, TextAlign.RIGHT, TextAlign.JUSTIFY]

const modelValue = defineModel<string>({ default: TextAlign.LEFT })
const open = shallowRef(false)
function handleSelectAlign(align: string) {
  open.value = false
  props.editor.chain().setTextAlign(align).focus().run()
}
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'p-0.5' }">
    <UTooltip
      text="Align"
      :content="{ side: 'top' }"
      :delay-duration="0"
      :disabled="disabled"
    >
      <UButton
        :icon="`i-lucide-align-${modelValue}`"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
        :disabled="disabled"
      />
    </UTooltip>
    <template #content>
      <UTooltip
        v-for="align in textAligns"
        :key="align"
        ignore-non-keyboard-focus
        :text="alignLabels[align]"
        :content="{ side: 'top' }"
        :delay-duration="0"
      >
        <UButton
          color="neutral"
          active-color="primary"
          variant="ghost"
          active-variant="soft"
          size="xs"
          class="mx-0.5 p-1"
          :icon="`i-lucide-align-${align}`"
          @click="handleSelectAlign(align)"
        />
      </UTooltip>
    </template>
  </UPopover>
</template>
