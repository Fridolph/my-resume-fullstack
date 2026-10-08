<script setup lang="ts">
import { FileApi } from '~/apis/files'
import { useUploadFile } from '~/composables/useUploadFile'

// 多张图片上传，默认 16 张，可通过 limitCount 控制，支持数据类型：数组
const props = withDefaults(
  defineProps<{
    modelValue?: Record<string, any>[] | null
    tip?: string
    maxFileSize?: number
    imageContainerSize?: string
    limitCount?: number
    verifyUploadedFileKey?: string
    hiddenCover?: boolean
  }>(),
  {
    maxFileSize: 1024 * 1024 * 2,
    imageContainerSize: 'w-40 h-40',
    limitCount: 16,
    verifyUploadedFileKey: 'verify_uploaded_file',
    hiddenCover: false,
  },
)
const emits = defineEmits(['update:modelValue'])

const attrs = useAttrs()
const defaultTip = 'JPG / PNG, max 2MB'

const uploadFiles = ref<File[]>([])

const { loading, handleFileSelect } = useUploadFile({
  maxFileSize: props.maxFileSize,
  accept: ['image/*'],
})

function handleClickCover(file: Record<string, any>) {
  props.modelValue?.forEach(v => {
    if (file === v) {
      v.coverFlag = 1
    } else {
      v.coverFlag = 0
    }
  })
  emits('update:modelValue', [...(props.modelValue || [])])
}

async function onFileSelect(files: File[] | null | undefined) {
  if (!files || files.length === 0) {
    return
  }

  const res = await handleFileSelect(files, async (formData: FormData) => {
    return FileApi.uploadFile(formData)
  })

  if (res) {
    emits('update:modelValue', [...(props.modelValue || []), ...(res || [])])
    uploadFiles.value = []
  }
}

function removeFile(file: Record<string, any>) {
  const newFiles = props.modelValue?.filter(v => v.originalFilePath !== file.originalFilePath)
  emits('update:modelValue', newFiles)
}

const canAddMore = computed(() => !attrs.disabled && (props.modelValue?.length || 0) < (props.limitCount || 16))
</script>

<template>
  <div class="h-full w-full">
    <div class="flex h-full flex-row flex-wrap items-center gap-2">
      <!-- Display uploaded images -->
      <template v-if="modelValue?.length">
        <div
          v-for="file in modelValue"
          :key="file.originalFilePath"
          class="group relative rounded-lg border border-gray-200 p-2"
          :class="imageContainerSize"
        >
          <img
            :src="file.originalFilePath"
            onload="this.style.opacity = 1"
            style="opacity: 0; transition: opacity 0.2s"
            alt="logo"
            class="m-auto h-full w-full object-contain"
          />
          <div
            v-if="!$attrs.disabled"
            class="cancelIcon absolute -right-1 -top-1 flex h-4 w-4 cursor-pointer rounded-full bg-gray-900 text-white"
          >
            <UIcon name="i-lucide-x" class="m-auto" @click="removeFile(file)" />
          </div>
          <div
            v-if="!hiddenCover"
            class="absolute bottom-0 right-0 h-2.25 w-20 cursor-pointer overflow-hidden"
            @click="!file.coverFlag && handleClickCover(file)"
          >
            <div
              :class="
                file.coverFlag
                  ? ' right-0 bottom-0 '
                  : ' group-hover:right-0 group-hover:bottom-0  -right-20 -bottom-2.25 '
              "
              class="absolute flex h-full w-full items-center justify-between rounded-tl-lg bg-slate-900 bg-opacity-80 px-2 text-white transition-all duration-300 ease-in-out"
            >
              <UIcon
                v-if="file.coverFlag"
                name="i-lucide-check-circle"
                class="flex shrink-0 text-white"
                size="1.25rem"
              />
              <div v-else class="m-0.5 h-5 w-5 rounded-full border-2" />
              Cover
            </div>
          </div>
        </div>
      </template>

      <!-- Upload component or button -->
      <div v-if="canAddMore" class="rounded-lg border border-gray-200" :class="imageContainerSize">
        <UFileUpload
          v-model="uploadFiles"
          accept="image/*"
          multiple
          variant="area"
          layout="grid"
          :preview="false"
          label="Upload image"
          :description="tip || defaultTip"
          icon="i-lucide-upload"
          :disabled="loading"
          class="h-full w-full"
          @update:model-value="onFileSelect"
        >
          <template #default="{ open }">
            <div
              v-if="loading"
              class="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-primary"
            >
              <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
              <div class="text-sm">Loading...</div>
            </div>
            <div
              v-else
              class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 p-4 text-center text-primary"
              @click="open()"
            >
              <UIcon name="i-lucide-upload" class="text-2xl text-primary" size="2rem" />
              <div class="text-sm text-primary">Upload image</div>
              <div class="text-xs leading-normal text-gray-400">
                {{ tip || defaultTip }}
              </div>
            </div>
          </template>
        </UFileUpload>
      </div>
    </div>
  </div>
</template>
