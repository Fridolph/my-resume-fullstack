<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{
  editor: Editor
  disabled?: boolean
}>()

const linkUrl = shallowRef('')
const active = computed(() => props.editor.isActive('link'))
const toolDisabled = computed(() => {
  if (!props.editor.isEditable) {
    return true
  }
  const { selection } = props.editor.state
  return selection.empty && !props.editor.isActive('link')
})
const open = shallowRef(false)

function setLink() {
  const value = linkUrl.value.trim()
  if (value === '') {
    return
  }

  let href = value
  const httpRegex = /^https?:\/\//i
  if (!httpRegex.test(href)) {
    href = href.replace(/^\/+/, '')
    href = `https://${href}`
  }
  props.editor.chain().setLink({ href }).focus().run()
  linkUrl.value = ''
  open.value = false
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    setLink()
  }
}

const handleDelete = useDebounceFn(() => {
  props.editor.chain().unsetLink().focus().run()
  linkUrl.value = ''
  open.value = false
}, 200)
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'flex p-0.5' }">
    <UTooltip
      text="Insert link"
      :content="{ side: 'top' }"
      :delay-duration="0"
      :disabled="disabled"
    >
      <UButton
        icon="i-lucide-link"
        color="neutral"
        active-color="primary"
        variant="ghost"
        :disabled="disabled || toolDisabled"
        :active="active"
        active-variant="soft"
        size="sm"
      />
    </UTooltip>
    <template #content>
      <UInput
        v-model="linkUrl"
        autofocus
        name="url"
        type="url"
        variant="none"
        placeholder="Paste a link..."
        @keydown="handleKeyDown"
      />
      <UButton
        size="sm"
        class="mx-1"
        :disabled="linkUrl === ''"
        @click="setLink"
      >
        Confirm
      </UButton>
      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
        @click="handleDelete"
      />
    </template>
  </UPopover>
</template>
