<script setup lang="ts">
import type { NodeViewProps } from "@tiptap/vue-3";
import { NodeViewWrapper } from "@tiptap/vue-3";

const props = defineProps<NodeViewProps>();
const content = shallowRef("");
function handleOpen() {
  const data = (props.editor.extensionStorage as any).mention.variables.find(
    (item: IMention) => item.placeholder === props.node.attrs.id,
  );
  if (!data) {
    return;
  }
  content.value = data.desc;
  const pos = props.getPos();
  if (typeof pos === "number") {
    const afterPosition = pos + props.node.nodeSize - 1;
    props.editor.chain().focus().setTextSelection(afterPosition).run();
    return true;
  }
}
</script>

<template>
  <NodeViewWrapper as="span">
    <UPopover :ui="{ content: 'px-2 py-1 text-xs text-[#9CA3AF]' }" @update:open="handleOpen">
      <span class="editor-mention">
        {{ node.attrs.id }}
      </span>
      <template #content>
        {{ content }}
      </template>
    </UPopover>
  </NodeViewWrapper>
</template>
