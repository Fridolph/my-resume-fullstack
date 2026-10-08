<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import useEditor from './useEditor'

const props = defineProps({
  textContent: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  variables: {
    type: Array<IMention>,
    default: () => [],
  },
  toolbar: {
    type: Boolean,
    default: true,
  },
  excludeToolBar: {
    type: Array<string>,
    default: () => [],
  },
})

const { controlType, heading, textAlign, textFontFamily, handlers, extensions, selectionUpdate } = useEditor()

const toolsConfig: DropdownMenuItem[][] = [
  [{ slot: 'heading' }, { slot: 'text-font-family' }],
  [
    {
      icon: 'i-lucide-bold',
      kind: 'bold',
      tooltip: { text: 'Bold', content: { side: 'top' }, delayDuration: 0 },
    },
    {
      icon: 'i-lucide-italic',
      kind: 'italic',
      tooltip: { text: 'Italic', content: { side: 'top' }, delayDuration: 0 },
    },
    {
      icon: 'i-lucide-underline',
      kind: 'underline',
      tooltip: { text: 'Underline', content: { side: 'top' }, delayDuration: 0 },
    },
    { slot: 'font-color' },
    { slot: 'bg-color' },
  ],
  [
    { slot: 'text-align' },
    {
      icon: 'i-lucide-list-ordered',
      kind: 'orderList',
      tooltip: { text: 'Numbered list', content: { side: 'top' }, delayDuration: 0 },
    },
    {
      icon: 'i-lucide-list',
      kind: 'bulletList',
      tooltip: { text: 'Bulleted list', content: { side: 'top' }, delayDuration: 0 },
    },
    {
      icon: 'i-lucide-indent-increase',
      kind: 'increase',
      tooltip: { text: 'Increase indent', content: { side: 'top' }, delayDuration: 0 },
    },
    {
      icon: 'i-lucide-indent-decrease',
      kind: 'decrease',
      tooltip: { text: 'Decrease indent', content: { side: 'top' }, delayDuration: 0 },
    },
  ],
  [
    { slot: 'link' },
    { slot: 'image' },
    { slot: 'variable' },
    {
      icon: 'i-lucide-minus',
      kind: 'horizontal',
      tooltip: { text: 'Insert horizontal line', content: { side: 'top' }, delayDuration: 0 },
    },
    { slot: 'more' },
    { slot: 'operation' },
  ],
]

const cToolsConfig = computed(() => {
  const list: DropdownMenuItem[][] = []
  toolsConfig.forEach(item => {
    const list2: DropdownMenuItem[] = []
    item.forEach(item2 => {
      if (!props.excludeToolBar.includes(item2.kind || item2.slot)) {
        list2.push(item2)
      }
    })
    if (list2.length) {
      list.push(list2)
    }
  })
  return list
})

const editorRef = ref()
const editorValue = defineModel<string>({ default: '' })

const uploading = shallowRef(false)
// UEditor 的 editor 是异步就绪的 ShallowRef，等它就绪后再注入 mention 变量
watch(
  () => editorRef.value?.editor as Editor | undefined,
  editor => {
    const mentionStorage = (editor?.extensionStorage as Record<string, any> | undefined)?.mention
    if (mentionStorage) {
      mentionStorage.variables = props.variables
    }
  },
  { immediate: true },
)

const sourceCode = shallowRef('')
function handleControlTypeChange() {
  const editor = editorRef.value?.editor as Editor | undefined
  if (!editor) {
    return
  }
  if (controlType.value === 'view') {
    editor.commands.setContent(sourceCode.value, {
      parseOptions: {
        preserveWhitespace: 'full',
      },
    })
  } else {
    const html = editor.getHTML()
    if (html) {
      sourceCode.value = html
    }
  }
}

function addVariable(variable: IMention) {
  const editor = editorRef.value?.editor as Editor | undefined
  if (!editor) {
    return
  }
  editor
    .chain()
    .insertMention({
      id: variable.placeholder,
    })
    .focus()
    .run()
}

defineExpose({
  addVariable,
})
</script>

<template>
  <div
    class="relative z-1 flex-1 overflow-auto rounded-md border border-muted"
    :class="[uploading ? 'overflow-hidden' : 'overflow-auto']"
  >
    <UEditor
      ref="editorRef"
      v-slot="{ editor }"
      v-model="editorValue"
      content-type="html"
      class="w-full"
      :starter-kit="{
        hardBreak: false,
        codeBlock: false,
        listKeymap: false,
        orderedList: false,
        bulletList: false,
        link: false,
      }"
      :editable="!disabled"
      :mention="false"
      :image="{
        allowBase64: true,
      }"
      :placeholder="placeholder"
      :extensions="extensions"
      :handlers="handlers"
      @selection-update="selectionUpdate"
    >
      <UEditorToolbar
        v-if="toolbar && !disabled"
        :editor="editor"
        :items="cToolsConfig"
        class="sticky inset-x-0 top-0 z-50 overflow-x-auto border-b border-muted bg-default px-2 py-2"
        :ui="{
          group: 'last:flex-1',
        }"
      >
        <template #heading>
          <TextEditorToolbarsHeading v-model="heading" :disabled="controlType === 'code'" :editor="editor" />
        </template>
        <template #text-font-family>
          <TextEditorToolbarsTextFontFamily
            v-model="textFontFamily"
            :disabled="controlType === 'code'"
            :editor="editor"
          />
        </template>
        <template #font-color>
          <TextEditorToolbarsTextColor :editor="editor" :disabled="controlType === 'code'" />
        </template>
        <template #bg-color>
          <TextEditorToolbarsBackgroundColor :editor="editor" :disabled="controlType === 'code'" />
        </template>
        <template #text-align>
          <TextEditorToolbarsTextAlign v-model="textAlign" :editor="editor" :disabled="controlType === 'code'" />
        </template>
        <template #link>
          <TextEditorToolbarsLink :editor="editor" :disabled="controlType === 'code'" />
        </template>
        <template #image>
          <TextEditorToolbarsImage v-model:loading="uploading" :editor="editor" :disabled="controlType === 'code'" />
        </template>
        <template #variable>
          <TextEditorToolbarsVariable :variables="variables" :editor="editor" :disabled="controlType === 'code'" />
        </template>
        <template #more>
          <TextEditorToolbarsMore :editor="editor" :disabled="controlType === 'code'" />
        </template>
        <template #operation>
          <TextEditorToolbarsOperation
            v-model="controlType"
            :editor="editor"
            @update:model-value="handleControlTypeChange"
          />
        </template>
      </UEditorToolbar>
    </UEditor>
    <div v-if="!disabled" v-show="controlType === 'code'" class="absolute top-11.25 z-1 h-[calc(100%-45px)] w-full">
      <UTextarea
        v-model="sourceCode"
        class="h-full w-full flex-col bg-white"
        variant="none"
        :ui="{
          base: 'flex-1 resize-none',
        }"
      />
    </div>
    <div
      v-if="uploading"
      class="absolute inset-0 top-0 z-10 flex items-center justify-center bg-[rgba(255,255,255,.88)]"
    >
      <UIcon name="i-lucide-loader-circle" :size="48" class="animate-spin text-primary" />
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

:deep(.tiptap) {
  caret-color: #1578d0;
  @apply p-4;
  p {
    @apply my-0 text-sm font-normal;
    line-height: 142%;
    &.is-editor-empty:first-child::before {
      @apply pointer-events-none float-left h-0 text-[#c6c6c6];
      content: attr(data-placeholder);
    }
  }

  .heading-0,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    @apply my-2 leading-none;
    text-wrap: pretty;
  }
  .heading-0 {
    @apply block text-5xl font-extrabold;
  }

  h1 {
    @apply text-[40px] font-extrabold;
  }

  h2 {
    @apply text-[32px] font-extrabold;
    line-height: 115%;
  }

  h3 {
    @apply text-2xl font-extrabold;
    line-height: 120%;
  }

  h4 {
    @apply text-xl font-extrabold;
    line-height: 133%;
  }

  h5 {
    @apply text-lg font-semibold;
    line-height: 140%;
  }

  h6 {
    @apply text-base font-semibold;
    line-height: 155%;
  }

  ul,
  ol {
    padding: 0 1rem;
    margin: 8px 1rem 8px 0.4rem;
    ul,
    ol {
      margin: 0;
    }
  }

  a {
    @apply cursor-pointer;
    border-color: var(--ui-primary);
  }

  img {
    @apply my-1;
  }

  div[data-type='horizontalRule'] {
    @apply my-0;
  }

  .editor-mention:not(.text) {
    @apply inline-block cursor-pointer rounded border border-[#9CA3AF] bg-[#F5F5F7] px-1 py-0.5 text-[#1C2128] box-decoration-clone;
  }

  table {
    @apply my-0;
  }

  blockquote {
    @apply my-2 border-l-4 border-[#1578D0] pl-4;
  }

  pre {
    background: #1c2128;
    border-radius: 8px;
    color: #fff;
    margin: 8px 0;
    padding: 16px;

    code {
      background: none;
      color: inherit;
      font-size: 14px;
      padding: 0;
    }
  }

  /* Code styling */
  .hljs-comment,
  .hljs-quote {
    color: #616161;
  }

  .hljs-variable,
  .hljs-template-variable,
  .hljs-attribute,
  .hljs-tag,
  .hljs-name,
  .hljs-regexp,
  .hljs-link,
  .hljs-name,
  .hljs-selector-id,
  .hljs-selector-class {
    color: #f98181;
  }

  .hljs-number,
  .hljs-meta,
  .hljs-built_in,
  .hljs-builtin-name,
  .hljs-literal,
  .hljs-type,
  .hljs-params {
    color: #fbbc88;
  }

  .hljs-string,
  .hljs-symbol,
  .hljs-bullet {
    color: #b9f18d;
  }

  .hljs-title,
  .hljs-section {
    color: #faf594;
  }

  .hljs-keyword,
  .hljs-selector-tag {
    color: #70cff8;
  }

  .hljs-emphasis {
    font-style: italic;
  }

  .hljs-strong {
    font-weight: 700;
  }
}
</style>
