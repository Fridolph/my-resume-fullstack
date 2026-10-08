<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { TextFontFamily } from '~/components/TextEditor/contants'

const props = defineProps<{
  editor: Editor
  disabled?: boolean
}>()

const textFontFamilys: string[] = [TextFontFamily.ROBOTO, TextFontFamily.POPPINS]

const modelValue = defineModel<string>({ default: TextFontFamily.ROBOTO })

function handleChange() {
  nextTick(() => {
    switch (modelValue.value) {
      case TextFontFamily.ROBOTO:
        props.editor.chain().focus().setFontFamily(TextFontFamily.ROBOTO).run()
        break
      case TextFontFamily.POPPINS:
        props.editor.chain().focus().setFontFamily(TextFontFamily.POPPINS).run()
        break
    }
  })
}
</script>

<template>
  <UTooltip text="Font" :content="{ side: 'top' }" :delay-duration="0" :disabled="disabled">
    <USelect
      v-model="modelValue"
      :disabled="disabled"
      :items="textFontFamilys"
      variant="ghost"
      size="sm"
      :ui="{
        base: 'cursor-pointer px-1 pe-5',
        content: 'max-h-max w-25',
        trailing: 'pr-1',
      }"
      @change="handleChange"
    />
  </UTooltip>
</template>
