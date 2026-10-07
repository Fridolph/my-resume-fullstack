import type { UploadedFile } from '~/types/file'
import { tryit } from 'radashi'
import { isAbortError } from '~/utils/request'

/** 上传进度；`percent` 为 0–100 的整数 */
export interface FileUploadProgress {
  loaded: number
  total: number
  percent: number
}

/** 独立请求 `uploadFiles` 的选项 */
export interface UploadFilesOptions {
  /** 接口 query contentType，默认 1 */
  contentType?: number
  /** 传入后可在中途 `abort()` 取消本次请求 */
  signal?: AbortSignal
  /** 上传进度回调 */
  onProgress?: (progress: FileUploadProgress) => void
}

/** 与历史 FileApi 默认值对齐 */
const DEFAULT_CONTENT_TYPE = 1
/** 批量上传接口路径 */
const UPLOAD_PATH = '/masterData/file/multipleUpload'

export function toFileUploadProgress(loaded: number, total: number): FileUploadProgress {
  const safeTotal = total > 0 ? total : 0
  const percent = safeTotal > 0 ? Math.min(100, Math.round((loaded / safeTotal) * 100)) : 0
  return { loaded, total: safeTotal, percent }
}

/** 把 File / File[] 收成接口要求的 FormData（字段名 `files`）；已是 FormData 则原样返回 */
export function toUploadFormData(input: FormData | File | File[]): FormData {
  if (input instanceof FormData) {
    return input
  }

  const formData = new FormData()
  const list = Array.isArray(input) ? input : [input]
  list.forEach((file) => {
    formData.append('files', file)
  })
  return formData
}

export function createUploadMethod(input: FormData | File | File[], contentType = DEFAULT_CONTENT_TYPE) {
  const formData = toUploadFormData(input)
  return useNuxtApp().$alova.Post(UPLOAD_PATH, formData, {
    params: { contentType },
    cacheFor: null,
  })
}

/**
 * 独立上传请求：不走校验与 toast，支持进度与取消。
 * 可直接传入 FormData、单个 File 或 File[]。
 */
export async function uploadFiles(
  input: FormData | File | File[],
  options: UploadFilesOptions = {},
): Promise<UploadedFile[]> {
  const { contentType = DEFAULT_CONTENT_TYPE, signal, onProgress } = options
  const method = createUploadMethod(input, contentType)
  const off = method.onUpload(({ loaded, total }: { loaded: number, total: number }) => {
    onProgress?.(toFileUploadProgress(loaded, total))
  })

  const onAbort = () => {
    void method.abort()
  }
  if (signal) {
    if (signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError')
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }

  const [err, result] = await tryit(() => method.send())()
  off()
  signal?.removeEventListener('abort', onAbort)

  if (err) {
    if (signal?.aborted || isAbortError(err)) {
      throw new DOMException('The operation was aborted.', 'AbortError')
    }
    throw err
  }

  return Array.isArray(result) ? result as UploadedFile[] : []
}

export function uploadFile(body: FormData, contentType = { contentType: 1 }): Promise<UploadedFile[]> {
  return uploadFiles(body, { contentType: contentType.contentType })
}

export const FileApi = {
  uploadFile,
}
