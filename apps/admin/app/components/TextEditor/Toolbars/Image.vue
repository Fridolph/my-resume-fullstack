<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
  disabled?: boolean
}>()

const loading = defineModel<boolean>('loading', { default: false })
const toast = useToast()
const file = shallowRef<File | null>(null)

function handleUpload() {
  if (!file.value) {
    return
  }

  const isImg = ['jpeg', 'jpg', 'png'].some((v: string) => file.value!.type.includes(v))
  const tooLarge = file.value!.size > 1024 * 1024 * 5
  if (!isImg || tooLarge) {
    toast.add({
      title: 'Error',
      description: 'Please upload a valid image (jpg/png, max 5MB).',
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
    return
  }

  loading.value = true
  const reader = new FileReader()
  reader.onload = () => {
    const src = reader.result as string
    if (src) {
      props.editor.chain().setImage({ src }).focus().run()
    }
    loading.value = false
  }
  reader.onerror = () => {
    loading.value = false
  }
  reader.readAsDataURL(file.value!)
}
</script>

<template>
  <UFileUpload
    v-model="file"
    accept="image/png,image/jpeg,image/jpg"
    variant="button"
    :preview="false"
    :ui="{
      base: 'border-none p-0',
    }"
    @change="handleUpload"
  >
    <template #leading>
      <UTooltip
        text="Insert image"
        :content="{ side: 'top' }"
        :delay-duration="0"
        :disabled="disabled"
      >
        <UButton
          icon="i-lucide-image"
          color="neutral"
          active-color="primary"
          variant="ghost"
          active-variant="soft"
          size="sm"
          :disabled="disabled"
        />
      </UTooltip>
    </template>
  </UFileUpload>
</template>
