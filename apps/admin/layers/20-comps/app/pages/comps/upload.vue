<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Ref } from 'vue'
import type { UploadedFile } from '~/types/file'
import * as z from 'zod'
import { uploadFiles } from '~/apis/files'
import { FileUploadError, useFileUploader } from '~/composables/useFileUploader'
import { imageDimensionRule, isAcceptedType, validateFiles } from '~/utils/fileValidation'
import { isAbortError } from '~/utils/request'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Upload',
})

const toast = useToast()

const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp']
const PDF_ACCEPT = ['application/pdf', '.pdf']

function summarize(list: readonly UploadedFile[] | UploadedFile[]) {
  if (!list.length) {
    return 'none'
  }
  return list.map(item => item.fileName).join(', ')
}

function usePreviewUrl(source: Ref<File | File[] | null | undefined>) {
  const url = ref<string>()

  watch(
    source,
    value => {
      if (url.value) {
        URL.revokeObjectURL(url.value)
      }
      const file = Array.isArray(value) ? value[0] : value
      url.value = file instanceof File ? URL.createObjectURL(file) : undefined
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (url.value) {
      URL.revokeObjectURL(url.value)
    }
  })

  return url
}

function notifyUploadError(err: unknown) {
  if (isAbortError(err)) {
    return
  }
  const rawMsg =
    err instanceof FileUploadError
      ? err.issue.messageKey
      : (err as { data?: { msg?: string }; message?: string })?.data?.msg || (err as { message?: string })?.message
  toast.add({
    title: 'Upload failed',
    description: typeof rawMsg === 'string' ? rawMsg : undefined,
    color: 'error',
  })
}

function runUpload(task: Promise<unknown>) {
  return task.catch(() => {})
}

// --- UploadFiles：编排上传，列表由使用方呈现 ---
const demoFiles = ref<UploadedFile[]>([])
const demoFilesCustom = ref<UploadedFile[]>([])
const DEMO_FILES_MAX = 4

// --- 1. 选中即上传 ---
const {
  files: autoFiles,
  uploading: autoUploading,
  progress: autoProgress,
  uploaded: autoUploaded,
  abort: abortAuto,
} = useFileUploader({
  accept: IMAGE_ACCEPT,
  maxFileSize: MAX_IMAGE_SIZE,
  maxCount: 8,
  contentType: 1,
  autoUpload: true,
  multiple: true,
  onError: notifyUploadError,
})

// --- 2. 先选后传（PDF + 插槽） ---
const {
  files: pdfFiles,
  uploading: pdfUploading,
  progress: pdfProgress,
  uploaded: pdfUploaded,
  upload: uploadPdf,
  abort: abortPdf,
} = useFileUploader({
  accept: PDF_ACCEPT,
  maxFileSize: 50 * 1024 * 1024,
  maxCount: 4,
  contentType: 2,
  multiple: true,
  onError: notifyUploadError,
})

// --- 3. 自定义插槽头像 ---
const {
  files: avatarFile,
  uploading: avatarUploading,
  uploaded: avatarUploaded,
  upload: uploadAvatar,
} = useFileUploader({
  accept: IMAGE_ACCEPT,
  maxFileSize: MAX_IMAGE_SIZE,
  contentType: 1,
  onError: notifyUploadError,
})
const avatarPreview = usePreviewUrl(avatarFile)

// --- 4. 图片尺寸校验 ---
const {
  files: sizedFiles,
  uploading: sizedUploading,
  uploaded: sizedUploaded,
  issue: sizedIssue,
} = useFileUploader({
  accept: IMAGE_ACCEPT,
  maxFileSize: MAX_IMAGE_SIZE,
  imageSize: {
    minWidth: 200,
    minHeight: 200,
    maxWidth: 4096,
    maxHeight: 4096,
  },
  contentType: 1,
  autoUpload: true,
  onError: notifyUploadError,
})

// --- 5. 独立调用 uploadFiles ---
const rawFile = shallowRef<File | null>(null)
const rawUploading = ref(false)
const rawPercent = ref(0)
const rawResult = ref<UploadedFile[]>([])
let rawController: AbortController | null = null

async function uploadRaw() {
  if (!rawFile.value) {
    toast.add({ title: 'Please select a file first', color: 'warning' })
    return
  }

  rawController?.abort()
  rawController = new AbortController()
  rawUploading.value = true
  rawPercent.value = 0

  try {
    rawResult.value = await uploadFiles(rawFile.value, {
      contentType: 1,
      signal: rawController.signal,
      onProgress: ({ percent }) => {
        rawPercent.value = percent
      },
    })
    toast.add({ title: 'Uploaded', description: summarize(rawResult.value), color: 'success' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    toast.add({ title: 'Upload failed', color: 'error' })
  } finally {
    rawUploading.value = false
    rawController = null
  }
}

function abortRaw() {
  rawController?.abort()
}

// --- 6. 表单校验 ---
const isFile = (value: unknown): value is File => value instanceof File

const formSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  avatar: z
    .custom<File>(isFile, { error: 'Avatar is required' })
    .refine(file => file.size <= MAX_IMAGE_SIZE, { error: 'Avatar must be under 2MB' })
    .refine(file => isAcceptedType(file, IMAGE_ACCEPT), { error: 'Only JPG / PNG / WebP' })
    .refine(
      async file => {
        const issue = await validateFiles([file], [imageDimensionRule({ minWidth: 200, minHeight: 200 })])
        return issue == null
      },
      { error: 'Avatar must be at least 200×200' },
    ),
  documents: z
    .array(z.custom<File>(isFile))
    .max(3, 'At most 3 PDFs')
    .refine(files => files.every(file => isAcceptedType(file, PDF_ACCEPT)), {
      error: 'Attachments must be PDF',
    }),
})

type FormSchema = z.output<typeof formSchema>

const formState = reactive<Partial<FormSchema>>({
  title: '',
  avatar: undefined,
  documents: [],
})

const formAvatar = computed({
  get: () => formState.avatar ?? null,
  set: (value: File | null | undefined) => {
    formState.avatar = value ?? undefined
  },
})

const formDocuments = computed({
  get: () => formState.documents ?? [],
  set: (value: File[] | null | undefined) => {
    formState.documents = value ?? []
  },
})

const formSubmitting = ref(false)
const formUploaded = ref<UploadedFile[]>([])
const formPreview = usePreviewUrl(formAvatar)

async function onSubmitForm(event: FormSubmitEvent<FormSchema>) {
  formSubmitting.value = true
  formUploaded.value = []
  try {
    const filesToUpload = [event.data.avatar, ...event.data.documents]
    formUploaded.value = await uploadFiles(filesToUpload, { contentType: 1 })
    toast.add({
      title: 'Form submitted',
      description: summarize(formUploaded.value),
      color: 'success',
    })
  } catch {
    toast.add({ title: 'Form file upload failed', color: 'error' })
  } finally {
    formSubmitting.value = false
  }
}
</script>

<template>
  <div class="content-pad max-w-4xl space-y-6">
    <div class="space-y-2">
      <h1 class="text-xl font-semibold tracking-tight text-highlighted">useFileUploader × UFileUpload</h1>
      <p class="text-sm text-muted">
        演示 UploadFiles（薄封装）、自动上传、手动上传、插槽定制、尺寸校验、独立 API，以及 UForm + Zod。 实际上传会请求
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">/masterData/file/multipleUpload</code
        >，模板未接入后端时会失败。
      </p>
    </div>

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      title="演示组件用法"
      description="上传请求打到 runtimeConfig.public.apiBase；模板未接后端，上传会失败，属预期。"
    />

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">UploadFiles：默认入口 + 外部列表</p>
          <p class="text-sm text-muted">multiple 多选追加；受 maxCount 剩余名额限制；上传中可取消</p>
        </div>
      </template>

      <div class="flex flex-wrap items-start gap-2">
        <div
          v-for="(file, index) in demoFiles"
          :key="`${file.originalFilePath}-${index}`"
          class="relative size-36 overflow-hidden rounded-lg border border-default p-2"
        >
          <img
            :src="file.thumbnailFilePath || file.originalFilePath"
            :alt="file.fileName"
            class="size-full object-contain"
          />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="solid"
            size="xs"
            square
            class="absolute -right-1.5 -top-1.5"
            :ui="{ base: 'p-0 rounded-full border-2 border-bg' }"
            @click="demoFiles = demoFiles.filter((_, i) => i !== index)"
          />
        </div>

        <UploadFiles
          v-model="demoFiles"
          multiple
          :accept="IMAGE_ACCEPT"
          :max-count="DEMO_FILES_MAX"
          :max-file-size="MAX_IMAGE_SIZE"
          label="Upload image"
          tip="Multi-select; use show-abort or slot/ref to cancel"
          class="size-36"
          show-abort
          :ui="{ root: 'size-full', base: 'size-full min-h-0', wrapper: 'p-0' }"
        />
      </div>
      <p class="mt-3 text-xs text-muted">
        Selected {{ demoFiles.length }} / {{ DEMO_FILES_MAX }}: {{ summarize(demoFiles) }}
      </p>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">UploadFiles：default slot 完全自定义</p>
          <p class="text-sm text-muted">用 open / removeAt / canAddMore / uploading 自己拼 UI（示例为 PDF 列表）</p>
        </div>
      </template>

      <UploadFiles
        v-model="demoFilesCustom"
        multiple
        :accept="PDF_ACCEPT"
        :max-count="DEMO_FILES_MAX"
        :max-file-size="50 * 1024 * 1024"
        :content-type="2"
      >
        <template #default="{ files, canAddMore, uploading, progress, open, abort, removeAt }">
          <div class="space-y-3">
            <ul v-if="files.length" class="divide-y divide-default rounded-lg border border-default">
              <li
                v-for="(file, index) in files"
                :key="`${file.originalFilePath}-${index}`"
                class="flex items-center gap-3 px-3 py-2"
              >
                <UIcon name="i-lucide-file-text" class="size-5 shrink-0 text-muted" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm">
                    {{ file.fileName || file.originalFilePath }}
                  </p>
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-trash-2"
                  :disabled="uploading"
                  @click="removeAt(index)"
                />
              </li>
            </ul>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-if="canAddMore"
                color="neutral"
                variant="outline"
                icon="i-lucide-upload"
                :loading="uploading"
                label="Add PDF"
                @click="open()"
              />
              <UButton v-if="uploading" color="neutral" variant="ghost" label="Cancel" @click="abort()" />
              <UProgress v-if="uploading" :model-value="progress.percent" class="w-40" />
              <p v-else-if="!canAddMore" class="text-xs text-muted">Reached the limit of {{ DEMO_FILES_MAX }}</p>
            </div>
          </div>
        </template>
      </UploadFiles>
      <p class="mt-3 text-xs text-muted">
        {{ summarize(demoFilesCustom) }}
      </p>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">1. 选中即上传</p>
          <p class="text-sm text-muted">autoUpload，图片多选，可看进度并中途取消</p>
        </div>
      </template>

      <UFileUpload
        v-model="autoFiles"
        accept="image/jpeg,image/png,image/webp"
        multiple
        layout="list"
        :disabled="autoUploading"
        icon="i-lucide-image"
        label="拖拽或点击上传图片"
        description="JPG / PNG / WebP，单张最大 2MB，最多 8 张，选中后自动上传"
        class="min-h-40 w-full"
      >
        <template #files-bottom>
          <div v-if="autoUploading" class="mt-3 flex items-center gap-3">
            <UProgress :model-value="autoProgress.percent" class="flex-1" />
            <span class="w-10 text-xs tabular-nums text-muted">{{ autoProgress.percent }}%</span>
            <UButton size="xs" color="neutral" variant="ghost" @click="abortAuto()"> 取消 </UButton>
          </div>
        </template>
      </UFileUpload>
      <p class="mt-3 text-xs text-muted">服务端文件：{{ summarize(autoUploaded) }}</p>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">2. 先选后传</p>
          <p class="text-sm text-muted">PDF，用 files-bottom / actions 插槽手动触发上传</p>
        </div>
      </template>

      <UFileUpload
        v-model="pdfFiles"
        accept="application/pdf"
        multiple
        layout="list"
        :interactive="false"
        icon="i-lucide-file-text"
        label="选择 PDF"
        description="仅 PDF，单文件最大 50MB，最多 4 个"
        class="min-h-40 w-full"
      >
        <template #actions="{ open }">
          <UButton color="neutral" variant="outline" icon="i-lucide-upload" label="选择文件" @click="open()" />
        </template>
        <template #files-bottom="{ files, removeFile }">
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <UButton
              :loading="pdfUploading"
              :disabled="!files?.length"
              label="开始上传"
              @click="runUpload(uploadPdf())"
            />
            <UButton color="neutral" variant="ghost" :disabled="!pdfUploading" label="取消" @click="abortPdf()" />
            <UButton v-if="files?.length" color="neutral" variant="outline" label="清空" @click="removeFile()" />
          </div>
          <UProgress v-if="pdfUploading" :model-value="pdfProgress.percent" class="mt-2" />
        </template>
      </UFileUpload>
      <p class="mt-3 text-xs text-muted">服务端文件：{{ summarize(pdfUploaded) }}</p>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">3. 自定义插槽</p>
          <p class="text-sm text-muted">使用默认插槽的 open / removeFile，做成头像选择</p>
        </div>
      </template>

      <UFileUpload
        v-slot="{ open, removeFile }"
        v-model="avatarFile"
        accept="image/jpeg,image/png,image/webp"
        :preview="false"
      >
        <div class="flex flex-wrap items-center gap-4">
          <UAvatar size="xl" :src="avatarPreview" icon="i-lucide-user" />
          <div class="space-y-2">
            <div class="flex flex-wrap gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :label="avatarFile ? '更换图片' : '选择图片'"
                @click="open()"
              />
              <UButton
                :loading="avatarUploading"
                :disabled="!avatarFile"
                label="上传"
                @click="runUpload(uploadAvatar())"
              />
              <UButton v-if="avatarFile" color="error" variant="link" label="移除" @click="removeFile()" />
            </div>
            <p v-if="avatarFile && !Array.isArray(avatarFile)" class="text-xs text-muted">
              {{ avatarFile.name }}
            </p>
          </div>
        </div>
      </UFileUpload>
      <p class="mt-3 text-xs text-muted">服务端文件：{{ summarize(avatarUploaded) }}</p>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">4. 图片尺寸校验</p>
          <p class="text-sm text-muted">imageDimensionRule：宽高需在 200×200 到 4096×4096 之间</p>
        </div>
      </template>

      <UFileUpload
        v-model="sizedFiles"
        accept="image/jpeg,image/png,image/webp"
        :disabled="sizedUploading"
        icon="i-lucide-scan"
        label="上传大图试试"
        description="小于 200px 的图会被拦截；通过后自动上传"
        class="min-h-36 w-full"
      />
      <p v-if="sizedIssue" class="mt-3 text-xs text-error">{{ sizedIssue.messageKey }}（{{ sizedIssue.code }}）</p>
      <p class="mt-3 text-xs text-muted">服务端文件：{{ summarize(sizedUploaded) }}</p>
      <pre>{{ sizedFiles }}</pre>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">5. 独立调用 uploadFiles</p>
          <p class="text-sm text-muted">不经过 useFileUploader 编排，直接请求（仍支持进度和取消）</p>
        </div>
      </template>

      <div class="space-y-3">
        <UFileUpload v-model="rawFile" accept="image/*" variant="button" :preview="true" />
        <div class="flex flex-wrap gap-2">
          <UButton :loading="rawUploading" label="直接上传" @click="uploadRaw" />
          <UButton color="neutral" variant="ghost" :disabled="!rawUploading" label="取消" @click="abortRaw" />
        </div>
        <UProgress v-if="rawUploading" :model-value="rawPercent" />
        <p class="text-xs text-muted">服务端文件：{{ summarize(rawResult) }}</p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">6. 表单校验</p>
          <p class="text-sm text-muted">UForm + Zod：标题必填，头像必选且校验类型 / 体积 / 尺寸，附件可选 PDF</p>
        </div>
      </template>

      <UForm :schema="formSchema" :state="formState" class="space-y-4" @submit="onSubmitForm">
        <UFormField name="title" label="标题" required>
          <UInput v-model="formState.title" placeholder="例如：产品封面" class="w-full" />
        </UFormField>

        <UFormField name="avatar" label="头像" required hint="JPG / PNG / WebP，至少 200×200，最大 2MB">
          <UFileUpload
            v-slot="{ open, removeFile }"
            v-model="formAvatar"
            accept="image/jpeg,image/png,image/webp"
            :preview="false"
          >
            <div class="flex items-center gap-3">
              <UAvatar size="lg" :src="formPreview" icon="i-lucide-image" />
              <UButton color="neutral" variant="outline" :label="formAvatar ? '更换' : '上传头像'" @click="open()" />
              <UButton v-if="formAvatar" color="error" variant="link" size="xs" label="移除" @click="removeFile()" />
            </div>
          </UFileUpload>
        </UFormField>

        <UFormField name="documents" label="附件" hint="可选，最多 3 个 PDF">
          <UFileUpload
            v-model="formDocuments"
            accept="application/pdf"
            multiple
            layout="list"
            icon="i-lucide-paperclip"
            label="添加 PDF"
            description="提交时随头像一起上传"
            class="w-full"
          />
        </UFormField>

        <div class="flex gap-2">
          <UButton type="submit" :loading="formSubmitting"> 提交并上传 </UButton>
        </div>
      </UForm>

      <p class="mt-3 text-xs text-muted">服务端文件：{{ summarize(formUploaded) }}</p>
    </UCard>
  </div>
</template>
