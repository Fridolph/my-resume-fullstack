<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { useDebounceFn } from '@vueuse/core'
import { emojis } from '~/components/TextEditor/contants'

const props = defineProps<{
  editor: Editor
  disabled?: boolean
}>()

const open = shallowRef(false)
const openEmoji = shallowRef(false)
function handleSelectEmoji(emoji: string) {
  updateDismissible()
  props.editor.chain().setEmoji(emoji).focus().run()
}

const handleToggleQuote = useDebounceFn(() => {
  updateDismissible()
  props.editor.chain().toggleBlockquote().focus().run()
}, 200)

const handleClearFormatting = useDebounceFn(() => {
  props.editor.commands.unsetAllMarks()
}, 200)

const undoDisabled = computed(() => !props.editor.can().undo())
const redoDisabled = computed(() => !props.editor.can().redo())
const handleUndo = useDebounceFn(() => {
  updateDismissible()
  props.editor.chain().undo().focus().run()
}, 200)
const handleRedo = useDebounceFn(() => {
  updateDismissible()
  props.editor.chain().redo().focus().run()
}, 200)
const handleToggleCodeBlock = useDebounceFn(() => {
  updateDismissible()
  props.editor.chain().toggleCodeBlock().focus().run()
}, 200)

const dismissible = shallowRef(true)
function updateDismissible() {
  dismissible.value = false
  setTimeout(() => {
    dismissible.value = true
  }, 200)
}
</script>

<template>
  <UPopover v-model:open="open" :dismissible="dismissible" :ui="{ content: 'p-0.5' }">
    <UTooltip
      text="More"
      :content="{ side: 'top' }"
      :delay-duration="0"
      :disabled="disabled"
    >
      <UButton
        icon="i-lucide-ellipsis-vertical"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
        :disabled="disabled"
      />
    </UTooltip>
    <template #content>
      <UPopover
        v-model:open="openEmoji"
        :dismissible="dismissible"
        :ui="{ content: 'p-0.5' }"
      >
        <UTooltip
          text="Emoji"
          :content="{ side: 'top' }"
          ignore-non-keyboard-focus
          :delay-duration="0"
        >
          <UButton
            icon="i-lucide-smile"
            color="neutral"
            active-color="primary"
            variant="ghost"
            active-variant="soft"
            size="sm"
          />
        </UTooltip>
        <template #content>
          <div class="grid max-h-40 grid-cols-7 gap-1 overflow-auto">
            <UButton
              v-for="(emoji, idx) in emojis"
              :key="idx"
              color="neutral"
              active-color="primary"
              variant="ghost"
              active-variant="soft"
              class="px-1 py-0.5 text-base"
              @click.prevent.stop="handleSelectEmoji(emoji.name)"
            >
              {{ emoji.emoji }}
            </UButton>
          </div>
        </template>
      </UPopover>
      <UTooltip text="Code block" :content="{ side: 'top' }" :delay-duration="0">
        <UButton
          icon="i-lucide-code"
          color="neutral"
          active-color="primary"
          variant="ghost"
          active-variant="soft"
          size="sm"
          @click="handleToggleCodeBlock"
        />
      </UTooltip>
      <UTooltip text="Quote" :content="{ side: 'top' }" :delay-duration="0">
        <UButton
          icon="i-lucide-text-quote"
          color="neutral"
          active-color="primary"
          variant="ghost"
          active-variant="soft"
          size="sm"
          @click="handleToggleQuote"
        />
      </UTooltip>
      <USeparator orientation="vertical" class="mx-1 inline-flex h-4" />
      <UTooltip text="Clear formatting" :content="{ side: 'top' }" :delay-duration="0">
        <UButton
          icon="i-lucide-remove-formatting"
          color="neutral"
          active-color="primary"
          variant="ghost"
          active-variant="soft"
          size="sm"
          @click="handleClearFormatting"
        />
      </UTooltip>
      <UTooltip text="Undo" :content="{ side: 'top' }" :delay-duration="0">
        <UButton
          icon="i-lucide-undo-2"
          color="neutral"
          active-color="primary"
          variant="ghost"
          active-variant="soft"
          size="sm"
          :disabled="undoDisabled"
          @click="handleUndo"
        />
      </UTooltip>
      <UTooltip text="Redo" :content="{ side: 'top' }" :delay-duration="0">
        <UButton
          icon="i-lucide-redo-2"
          color="neutral"
          active-color="primary"
          variant="ghost"
          active-variant="soft"
          size="sm"
          :disabled="redoDisabled"
          @click="handleRedo"
        />
      </UTooltip>
    </template>
  </UPopover>
</template>
