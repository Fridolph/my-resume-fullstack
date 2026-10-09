import { isApiSuccess } from '@template/common'
import type { UploadedFile } from '~/types/file'

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

/** 上传响应的宽松形状：后端 upload 接口尚未定稿，只做最小假设（对齐 packages/common 字段名） */
interface UploadResponsePayload {
  code?: number
  message?: string
  data?: unknown
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
  list.forEach(file => {
    formData.append('files', file)
  })
  return formData
}

function uploadUrl(contentType: number): string {
  const apiBase = String(useRuntimeConfig().public.apiBase || '').replace(/\/$/, '')
  return `${apiBase}${UPLOAD_PATH}?contentType=${encodeURIComponent(String(contentType))}`
}

/** 按 `{ code, data, message }`（packages/common）解包；字符串响应先 JSON.parse */
function unwrapUploadResponse(responseText: string, status: number): UploadedFile[] {
  let payload: UploadResponsePayload
  try {
    payload = JSON.parse(responseText || '{}') as UploadResponsePayload
  } catch {
    throw new Error('Upload failed')
  }

  const httpOk = status >= 200 && status < 300
  if (httpOk && isApiSuccess(payload)) {
    return Array.isArray(payload.data) ? (payload.data as UploadedFile[]) : []
  }

  throw new Error(payload.message || 'Request failed')
}

/**
 * 上传文件：**刻意用原生 XHR**（不是 fetch）。
 *
 * `fetch` 拿不到上传进度，也无法取消一个已发出的请求体；XHR 的 `upload.onprogress`
 * 与 `abort()` 才能同时满足「进度条」与「取消」。这与数据层其余部分并不冲突：
 * 进度 / 取消属于 XHR 的能力，状态与失效由 colada mutation 负责（见 `useFileUploader`）。
 *
 * 可直接传入 FormData、单个 File 或 File[]。用户取消时抛 `AbortError`。
 */
export function uploadFiles(
  input: FormData | File | File[],
  options: UploadFilesOptions = {},
): Promise<UploadedFile[]> {
  const { contentType = DEFAULT_CONTENT_TYPE, signal, onProgress } = options

  return new Promise<UploadedFile[]>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'))
      return
    }

    const xhr = new XMLHttpRequest()
    let handleAbort = () => {}
    const cleanup = () => signal?.removeEventListener('abort', handleAbort)

    handleAbort = () => xhr.abort()
    signal?.addEventListener('abort', handleAbort, { once: true })

    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) {
        onProgress?.(toFileUploadProgress(event.loaded, event.total))
      }
    })

    xhr.addEventListener('abort', () => {
      cleanup()
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    })

    xhr.addEventListener('error', () => {
      cleanup()
      reject(new Error('Upload failed'))
    })

    xhr.addEventListener('load', () => {
      cleanup()
      try {
        resolve(unwrapUploadResponse(xhr.responseText, xhr.status))
      } catch (err) {
        reject(err)
      }
    })

    xhr.open('POST', uploadUrl(contentType), true)
    xhr.send(toUploadFormData(input))
  })
}

/**
 * 兼容旧调用（`useUploadFile` 等仍在使用）。
 * 新代码请直接用 `uploadFiles`，或在组件里用 `useFileUploader`（带校验与进度状态）。
 */
export function uploadFile(body: FormData, contentType = { contentType: 1 }): Promise<UploadedFile[]> {
  return uploadFiles(body, { contentType: contentType.contentType })
}

export const FileApi = {
  uploadFile,
}
