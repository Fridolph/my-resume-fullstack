import type { MaybeRefOrGetter } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'
import type { UploadedFile } from '~/types/file'
import type { FileUploadProgress } from '~/apis/files'
import type { FileRule, FileRuleIssue, FileUploadInput, ImageDimensionOptions } from '~/utils/fileValidation'
import { useMutation } from '@pinia/colada'
import { tryit } from 'radashi'
import { uploadFiles } from '~/apis/files'
import {
  fileCountRule,
  fileSizeRule,
  fileTypeRule,
  imageDimensionRule,
  normalizeFileInput,
  validateFiles,
} from '~/utils/fileValidation'
import { isAbortError } from '@template/common'

/** 校验失败时由 `upload` / `validate` 抛出，`issue` 带 messageKey 给使用方自行提示 */
export class FileUploadError extends Error {
  readonly issue: FileRuleIssue

  constructor(issue: FileRuleIssue) {
    super(issue.messageKey)
    this.name = 'FileUploadError'
    this.issue = issue
  }
}

export interface UseFileUploadOptions {
  /** 单文件大小上限（字节），默认 50MB；传 Infinity 可关闭 */
  maxFileSize?: MaybeRefOrGetter<number>
  /**
   * 允许的类型：完整 MIME（如 image/png）、主类型通配（如所有 image）、或扩展名（如 .pdf）。
   * 不传则不限制格式。
   */
  accept?: MaybeRefOrGetter<string | string[]>
  /** 单次最多上传个数，不传则不限制 */
  maxCount?: MaybeRefOrGetter<number>
  /** 图片宽高约束；非图片文件会跳过此规则 */
  imageSize?: MaybeRefOrGetter<ImageDimensionOptions | undefined>
  /** 额外规则，与上面的快捷配置一起执行。 */
  rules?: MaybeRefOrGetter<FileRule[]>
  /**
   * 上传接口 query contentType，默认 1。
   * 已知用法：编辑器插图 0、普通图片 1、PDF 2。
   */
  contentType?: MaybeRefOrGetter<number>
  /** 选中文件后自动上传。只需把返回的 files 绑到 UFileUpload 的 v-model */
  autoUpload?: boolean
  /**
   * 是否多选。true 时 `files` 为 File[]，对应 UFileUpload 的 multiple；
   * false 时为 File | null，对应单文件。
   */
  multiple?: boolean
  onSuccess?: (files: UploadedFile[]) => void
  onError?: (error: unknown) => void
  onProgress?: (progress: FileUploadProgress) => void
}

/** 未配置 maxFileSize 时的默认上限：50MB */
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024
/** 与历史 FileApi 默认值对齐 */
const DEFAULT_CONTENT_TYPE = 1

function isUploadedFileList(value: unknown): value is UploadedFile[] {
  return Array.isArray(value)
}

/** 与 UFileUpload v-model 对齐：多选为 File[]，单选为 File | null */
export type FileUploadModel<M extends boolean> = M extends true ? File[] : File | null

function toFilesModel<M extends boolean>(value: FileUploadInput, multiple: M): FileUploadModel<M> {
  const list = normalizeFileInput(value)
  return (multiple ? list : (list[0] ?? null)) as FileUploadModel<M>
}

/**
 * 文件上传编排：可组合校验 + colada mutation（网络层为原生 XHR）+ 对接 UFileUpload。
 *
 * `files` 可直接作为 UFileUpload 的 v-model；插槽里的 open / removeFile 仍由组件提供。
 * 校验或请求失败会抛错（校验为 `FileUploadError`），不内置 toast；
 * 使用方用 `tryit` / `onError` 自行提示。空文件与用户取消不视为错误。
 *
 * 注意：Nuxt UI 已占用自动导入名 `useFileUpload`（拖拽/打开文件选择），
 * 因此本编排 composable 使用 `useFileUploader`。
 */
export function useFileUploader<M extends boolean = false>(options: UseFileUploadOptions & { multiple?: M } = {}) {
  const multiple = (options.multiple ?? false) as M

  /** 绑定 UFileUpload v-model：单文件为 File | null，多文件为 File[] */
  const files = shallowRef<FileUploadModel<M>>(toFilesModel(null, multiple))
  /** 请求进行中；与 `loading` 为同一状态 */
  const uploading = ref(false)
  const progress = ref<FileUploadProgress>({ loaded: 0, total: 0, percent: 0 })
  /** 最近一次成功返回的服务端文件列表 */
  const uploaded = ref<UploadedFile[]>([])
  const error = ref<unknown>(null)
  /** 最近一次校验失败；通过则为 null */
  const issue = ref<FileRuleIssue | null>(null)

  /** 当前上传的取消句柄：上传不可复用进行中的请求，否则进度 / 取消会对错文件 */
  const abortController = shallowRef<AbortController | null>(null)

  /**
   * 上传走 colada mutation（数据层统一在 colada），但**网络层是原生 XHR** ——
   * `fetch` 拿不到进度、也不能取消请求体（见 `apis/files.ts` 的 `uploadFiles`）。
   * 进度与取消由 XHR + `AbortController` 提供，状态与失效交给 colada。
   */
  const uploadMutation = useMutation({
    mutation: async (payload: { files: File[]; contentType: number }) => {
      abortController.value?.abort()
      const controller = new AbortController()
      abortController.value = controller

      return await uploadFiles(payload.files, {
        contentType: payload.contentType,
        signal: controller.signal,
        onProgress: next => {
          progress.value = next
          options.onProgress?.(next)
        },
      })
    },
  })

  /** 把快捷配置（accept / maxFileSize 等）转成规则，再拼上自定义 `rules` */
  function resolveRules(): FileRule[] {
    const list: FileRule[] = []
    const accept = toValue(options.accept)
    if (accept) {
      list.push(fileTypeRule(accept))
    }

    const maxFileSize = toValue(options.maxFileSize) ?? DEFAULT_MAX_FILE_SIZE
    if (Number.isFinite(maxFileSize)) {
      list.push(fileSizeRule(maxFileSize))
    }

    const maxCount = toValue(options.maxCount)
    if (typeof maxCount === 'number') {
      list.push(fileCountRule(maxCount))
    }

    const imageSize = toValue(options.imageSize)
    if (imageSize) {
      list.push(imageDimensionRule(imageSize))
    }

    const extra = toValue(options.rules)
    if (extra?.length) {
      list.push(...extra)
    }

    return list
  }

  /**
   * 校验文件，不发请求。
   * 空输入静默返回 `{ ok: false }`；规则失败抛 `FileUploadError`。
   */
  async function validate(input: FileUploadInput = files.value): Promise<{
    ok: boolean
    files: File[]
    issue: FileRuleIssue | null
  }> {
    const selected = normalizeFileInput(input)
    if (selected.length === 0) {
      issue.value = null
      return { ok: false, files: [], issue: null }
    }

    const nextIssue = await validateFiles(selected, resolveRules())
    issue.value = nextIssue
    if (nextIssue) {
      const err = new FileUploadError(nextIssue)
      error.value = err
      options.onError?.(err)
      throw err
    }

    error.value = null
    return { ok: true, files: selected, issue: null }
  }

  /** 取消当前上传；用户取消不视为错误 */
  function abort() {
    abortController.value?.abort()
    abortController.value = null
  }

  function resetProgress() {
    progress.value = { loaded: 0, total: 0, percent: 0 }
  }

  /**
   * 校验通过后走 colada mutation 批量上传（进度 / 取消由 XHR 提供）。
   * 也可作为 UFileUpload 的 `@update:model-value` 处理函数（不要绑 `@change`）。
   */
  async function upload(input: FileUploadInput = files.value): Promise<UploadedFile[] | null> {
    const checked = await validate(input)
    if (!checked.ok || checked.files.length === 0) {
      return null
    }

    abort()
    uploading.value = true
    error.value = null
    resetProgress()

    const [err, result] = await tryit(() =>
      uploadMutation.mutateAsync({
        files: checked.files,
        contentType: toValue(options.contentType) ?? DEFAULT_CONTENT_TYPE,
      }),
    )()

    uploading.value = false

    if (err) {
      // 用户取消不算失败
      if (isAbortError(err)) {
        error.value = null
        return null
      }
      error.value = err
      options.onError?.(err)
      throw err
    }

    if (!isUploadedFileList(result)) {
      const invalid = new Error('Upload failed')
      error.value = invalid
      throw invalid
    }

    progress.value = { ...progress.value, percent: 100 }
    uploaded.value = result
    options.onSuccess?.(result)
    return result
  }

  /**
   * UFileUpload `@update:model-value` 的便捷处理。
   * `autoUpload` 为 true 时只同步 `files`，实际上传由 watch 触发，避免重复请求。
   */
  async function onFilesChange(value: File | File[] | null | undefined) {
    files.value = toFilesModel(value, multiple)
    if (options.autoUpload) {
      return
    }
    return validate(value)
  }

  /** 取消进行中的请求，并清空选择、进度、错误与已上传结果 */
  function reset() {
    abort()
    files.value = toFilesModel(null, multiple)
    uploaded.value = []
    issue.value = null
    error.value = null
    uploading.value = false
    resetProgress()
  }

  function clearError() {
    error.value = null
    issue.value = null
  }

  if (options.autoUpload) {
    watch(files, value => {
      if (normalizeFileInput(value).length === 0) {
        return
      }
      // autoUpload 没有使用方 await，用 tryit 吞掉 rejection，错误走 throw 前的 onError / error ref
      void tryit(() => upload(value))()
    })
  }

  tryOnScopeDispose(() => {
    abort()
  })

  return {
    /** 绑定 UFileUpload 的 v-model */
    files,
    /** 请求进行中 */
    uploading: readonly(uploading),
    /** `uploading` 的别名，便于和旧代码的 loading 对齐 */
    loading: readonly(uploading),
    progress: readonly(progress),
    /** 最近一次成功的服务端返回 */
    uploaded: readonly(uploaded),
    error: readonly(error),
    issue: readonly(issue),
    validate,
    upload,
    abort,
    onFilesChange,
    reset,
    clearError,
  }
}
