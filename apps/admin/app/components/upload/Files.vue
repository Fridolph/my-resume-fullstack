<script setup lang="ts">
import type { FileUploadProps } from '@nuxt/ui'
import type { UploadedFile } from '~/types/file'
import type { ImageDimensionOptions } from '~/utils/fileValidation'
import { useFileDialog } from '@vueuse/core'
import { FileUploadError, useFileUploader } from '~/composables/useFileUploader'
import { isAbortError } from '~/utils/request'

type FileUploadUi = NonNullable<FileUploadProps['ui']>

export interface UploadFilesSlotProps {
  files: UploadedFile[]
  uploading: boolean
  progress: { loaded: number, total: number, percent: number }
  canAddMore: boolean
  /** 本次还能再选几个；无 maxCount 时为 Infinity */
  remaining: number
  multiple: boolean
  disabled: boolean
  open: () => void
  abort: () => void
  removeAt: (index: number) => void
  remove: (file: UploadedFile) => void
  clear: () => void
  reset: () => void
}

const {
  maxCount,
  maxFileSize,
  accept,
  tip,
  label,
  icon = 'i-lucide-upload',
  color = 'primary',
  size = 'md',
  disabled = false,
  contentType = 1,
  imageSize,
  /** 是否一次可选多个；默认 false（单次单个） */
  multiple = false,
  showAbort = false,
  class: className,
  ui,
} = defineProps<{
  /** 已上传数量上限；达上限后默认入口隐藏，slot 内仍可通过 canAddMore 自行处理 */
  maxCount?: number
  /** 单文件大小上限（字节）；不传则用 useFileUploader 默认 50MB */
  maxFileSize?: number
  /** 允许的类型；不传则不限制 */
  accept?: string | string[]
  /** 默认入口 description */
  tip?: string
  /** 默认入口 label */
  label?: string
  icon?: FileUploadProps['icon']
  color?: FileUploadProps['color']
  size?: FileUploadProps['size']
  disabled?: boolean
  contentType?: number
  imageSize?: ImageDimensionOptions
  /** 是否支持一次选择多个文件，默认 false */
  multiple?: boolean
  /**
   * 默认入口是否展示内置取消按钮（仅无 default slot 时生效）。
   * 取消能力始终可通过 `#abort` / `#default` 的 `abort` 或 ref.expose 使用。
   */
  showAbort?: boolean
  class?: any
  /** 透传给默认 UFileUpload 的 ui */
  ui?: FileUploadUi
}>()

defineSlots<{
  default?: (props: UploadFilesSlotProps) => any
  leading?: (props: {
    uploading: boolean
    progress: UploadFilesSlotProps['progress']
  }) => any
  /** 默认入口上传中的取消区；不传且 showAbort 时用内置按钮 */
  abort?: (props: {
    abort: () => void
    uploading: boolean
    progress: UploadFilesSlotProps['progress']
  }) => any
}>()

const model = defineModel<UploadedFile[] | null>({ default: () => [] })

const toast = useToast()
const slots = useSlots()

const files = computed(() => model.value ?? [])

const remaining = computed(() => {
  if (typeof maxCount !== 'number') {
    return Number.POSITIVE_INFINITY
  }
  return Math.max(0, maxCount - files.value.length)
})

const canAddMore = computed(() => !disabled && remaining.value > 0)

const acceptAttr = computed(() => {
  if (accept == null) {
    return '*'
  }
  const list = Array.isArray(accept) ? accept : accept.split(',').map(s => s.trim()).filter(Boolean)
  const mime = list.filter(item => item.includes('/'))
  return (mime.length ? mime : list).join(',') || '*'
})

const uploadLabel = computed(() => label || 'Upload image')
const uploadDescription = computed(() => tip)

/** 本次选择的数量上限（受剩余名额约束） */
const batchMaxCount = computed(() => {
  if (!Number.isFinite(remaining.value)) {
    return undefined
  }
  return remaining.value
})

function notifyError(err: unknown) {
  if (isAbortError(err)) {
    return
  }
  const rawMsg = err instanceof FileUploadError
    ? err.issue.messageKey
    : (err as { data?: { msg?: string }, message?: string })?.data?.msg
      || (err as { message?: string })?.message
  toast.add({
    title: 'Upload failed',
    description: typeof rawMsg === 'string' ? rawMsg : undefined,
    color: 'error',
  })
}

function limitSelection(list: File[]): File[] {
  const cap = batchMaxCount.value
  if (typeof cap !== 'number') {
    return list
  }
  return list.slice(0, cap)
}

const {
  files: pickerFiles,
  uploading,
  progress,
  upload,
  abort,
  reset,
} = useFileUploader({
  ...(accept != null ? { accept: (() => accept) as () => string | string[] } : {}),
  ...(maxFileSize != null ? { maxFileSize: () => maxFileSize } : {}),
  ...(typeof maxCount === 'number'
    ? { maxCount: () => Math.max(0, maxCount - files.value.length) }
    : {}),
  imageSize: () => imageSize,
  contentType: () => contentType,
  autoUpload: true,
  multiple,
  onSuccess(uploaded) {
    model.value = [...files.value, ...uploaded]
    reset()
  },
  onError(err) {
    notifyError(err)
    reset()
  },
})

const {
  open: openDialog,
  reset: resetDialog,
  onChange: onDialogChange,
} = useFileDialog({
  multiple,
  reset: true,
})

onDialogChange((selected) => {
  if (!selected?.length || !canAddMore.value || uploading.value) {
    resetDialog()
    return
  }

  const limited = limitSelection(Array.from(selected))
  if (!limited.length) {
    resetDialog()
    return
  }

  pickerFiles.value = (multiple ? limited : (limited[0] ?? null)) as typeof pickerFiles.value
  resetDialog()
})

function open() {
  if (!canAddMore.value || uploading.value || disabled) {
    return
  }
  openDialog({
    accept: acceptAttr.value,
    multiple,
  })
}

function cancelUpload() {
  abort()
  reset()
}

function removeAt(index: number) {
  if (disabled || uploading.value) {
    return
  }
  model.value = files.value.filter((_, i) => i !== index)
}

function remove(file: UploadedFile) {
  if (disabled || uploading.value) {
    return
  }
  model.value = files.value.filter(item => item.originalFilePath !== file.originalFilePath)
}

function clear() {
  if (disabled || uploading.value) {
    return
  }
  model.value = []
  reset()
}

const slotProps = computed<UploadFilesSlotProps>(() => ({
  files: files.value,
  uploading: uploading.value,
  progress: progress.value,
  canAddMore: canAddMore.value,
  remaining: remaining.value,
  multiple,
  disabled: disabled || uploading.value,
  open,
  abort: cancelUpload,
  removeAt,
  remove,
  clear,
  reset,
}))

defineExpose({
  files,
  uploading,
  progress,
  canAddMore,
  remaining,
  open,
  abort: cancelUpload,
  removeAt,
  remove,
  clear,
  reset,
  upload,
})
</script>

<template>
  <!-- 达上限且无 default slot / 非上传中时不渲染，避免 grid 里留下空格子 -->
  <div
    v-if="slots.default || canAddMore || uploading"
    class="upload-files"
    data-slot="root"
    :class="className"
  >
    <slot v-if="slots.default" v-bind="slotProps" />

    <div
      v-else
      class="relative size-full"
    >
      <UFileUpload
        v-model="pickerFiles"
        :accept="acceptAttr"
        :multiple
        variant="area"
        :preview="false"
        :color
        :size
        :icon="false"
        :label="uploading ? (progress.percent > 0 ? `${progress.percent}%` : 'Loading...') : uploadLabel"
        :description="uploading ? undefined : uploadDescription"
        :disabled="disabled || uploading"
        class="size-full"
        :ui
      >
        <template #leading>
          <slot name="leading" :uploading :progress>
            <UAvatar
              v-if="icon !== false"
              :icon="uploading ? 'i-lucide-loader-circle' : (typeof icon === 'string' ? icon : undefined)"
              :size
              :color
              data-slot="avatar"
            />
          </slot>
        </template>
      </UFileUpload>

      <div
        v-if="uploading && (showAbort || !!slots.abort)"
        class="absolute inset-x-2 bottom-2 z-10"
      >
        <slot name="abort" :abort="cancelUpload" :uploading :progress>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            class="w-full justify-center"
            label="Cancel"
            @click="cancelUpload()"
          />
        </slot>
      </div>
    </div>
  </div>
</template>
