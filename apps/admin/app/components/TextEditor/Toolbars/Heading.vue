<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { Headings } from "~/components/TextEditor/contants";

const props = defineProps<{
  editor: Editor;
  disabled?: boolean;
}>();

const headings: string[] = [
  Headings.NORMAL,
  Headings.TITLE,
  Headings.HEADING_1,
  Headings.HEADING_2,
  Headings.HEADING_3,
  Headings.HEADING_4,
  Headings.HEADING_5,
  Headings.HEADING_6,
];

const modelValue = defineModel<string>({ default: Headings.NORMAL });

function handleChange() {
  nextTick(() => {
    switch (modelValue.value) {
      case Headings.NORMAL:
        props.editor.chain().focus().setParagraph().run();
        break;
      case Headings.TITLE:
        props.editor.chain().focus().setTitle().run();
        break;
      case Headings.HEADING_1:
        props.editor.chain().focus().setHeading({ level: 1 }).run();
        break;
      case Headings.HEADING_2:
        props.editor.chain().focus().setHeading({ level: 2 }).run();
        break;
      case Headings.HEADING_3:
        props.editor.chain().focus().setHeading({ level: 3 }).run();
        break;
      case Headings.HEADING_4:
        props.editor.chain().focus().setHeading({ level: 4 }).run();
        break;
      case Headings.HEADING_5:
        props.editor.chain().focus().setHeading({ level: 5 }).run();
        break;
      case Headings.HEADING_6:
        props.editor.chain().focus().setHeading({ level: 6 }).run();
        break;
    }
  });
}
</script>

<template>
  <UTooltip text="Styles" :content="{ side: 'top' }" :delay-duration="0" :disabled="disabled">
    <USelect
      v-model="modelValue"
      :disabled="disabled"
      :items="headings"
      variant="ghost"
      :ui="{
        base: 'cursor-pointer px-1 pe-5',
        content: 'max-h-max w-25',
        trailing: 'pr-1',
      }"
      size="sm"
      @change="handleChange"
    />
  </UTooltip>
</template>
