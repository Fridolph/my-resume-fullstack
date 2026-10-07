<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{
  editor: Editor
  disabled?: boolean
  variables: IMention[]
}>()

const variableFilterText = shallowRef('')
const variableFilter = computed(() => {
  return props.variables.filter((item) => {
    return variableFilterText.value === '' || (item.placeholder.includes(variableFilterText.value) || item.desc.includes(variableFilterText.value))
  })
})

const open = shallowRef(false)
const handleVariableSelect = useDebounceFn((variable: IMention) => {
  variableFilterText.value = ''
  props.editor.chain().insertMention({
    id: variable.placeholder,
  }).focus().run()
}, 200)
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'p-0.5' }">
    <UTooltip
      text="Insert variable"
      :content="{ side: 'top' }"
      :delay-duration="0"
      :disabled="disabled"
    >
      <UButton
        icon="i-lucide-braces"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
        :disabled="disabled"
      />
    </UTooltip>
    <template #content>
      <div class="px-2 py-1">
        <UInput
          v-model="variableFilterText"
          class="w-full"
          icon="i-lucide-search"
          size="sm"
          variant="outline"
          placeholder="Search variable"
        />
        <ul class="z-30 mt-1 max-h-70 w-125 overflow-auto border-t border-[#E2E6EC] pt-0.5">
          <li
            v-for="variable in variableFilter"
            :key="variable.id"
            class="cursor-pointer rounded p-2 text-xs hover:bg-[#1578d01a]"
            @click="handleVariableSelect(variable)"
          >
            <span class="mb-1 inline-block rounded border border-[#9CA3AF] bg-[#F5F5F7] px-1 py-0.5 text-[#1C2128] box-decoration-clone">{{ variable.placeholder }}</span>
            <span class="block text-[#9CA3AF]">{{ variable.desc }}</span>
          </li>
        </ul>
      </div>
    </template>
  </UPopover>
</template>
