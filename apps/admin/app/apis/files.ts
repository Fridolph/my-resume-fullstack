import { isApiSuccess, TOKEN_COOKIE_KEY, type UploadPurpose } from '@rs/common'

// 纯换算已收到 `@rs/utils`（DAO-035）；表单组装与响应解包仍留在这里 —— 它们与后端约定绑定。
// 下面先 import（本文件自己要用），再对外转发（调用方不必知道它搬了家）。
import { toFileUploadProgress, type FileUploadProgress } from '@rs/utils/file-upload'
export { toFileUploadProgress, type FileUploadProgress } from '@rs/utils/file-upload'
import type { UploadedFile as SharedUploadedFile } from '@rs/common'
import type { UploadedFile } from '~/types/file'

/** 上传用途：决定服务端磁盘一级目录（头像 / 简历素材 / 简历导入） */
export type { UploadPurpose }

/** 上传进度；`percent` 为 0–100 的整数 */
/** 独立请求 `uploadFiles` 的选项 */
export interface UploadFilesOptions {
  /** 接口 query contentType，默认 1 */
  contentType?: number
  /** 传入后可在中途 `abort()` 取消本次请求 */
  signal?: AbortSignal
  /** 上传进度回调 */
  onProgress?: (progress: FileUploadProgress) => void
  /** 用途（默认交给服务端取 `resume-asset`） */
  purpose?: UploadPurpose
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
/**
 * 上传端点（DAO-036）。原来是模板遗留的 `/masterData/file/multipleUpload` —— **实测 404**。
 * 现在指向真正的 `POST /api/upload/files`（服务端已实测：合法 png 通过、svg 与路径穿越被拒）。
 */
const UPLOAD_PATH = '/upload/files'

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

/**
 * 组装上传 URL。
 *
 * 不再带 `?contentType=`：那是旧模板接口的参数，新端点用 `purpose`（写在 FormData 里）
 * 表达"这是干什么用的文件"。多塞一个服务端不认的参数只会让后来的人以为它有用。
 */
function uploadUrl(): string {
  const apiBase = String(useRuntimeConfig().public.apiBase || '').replace(/\/$/, '')
  return `${apiBase}${UPLOAD_PATH}`
}

/**
 * 从 cookie 取访问令牌。
 *
 * 为什么不用 `useCookie()`：这个函数是**纯 XHR**、可能在组件 setup 之外被调用
 *（`uploadFile` 这类兼容入口），没有 Nuxt 上下文时 `useCookie` 会报错。
 * 读 `document.cookie` 是同步且无依赖的做法；XHR 本来就只在客户端跑。
 */
function readToken(): string | undefined {
  if (!import.meta.client) return undefined
  const entry = document.cookie.split('; ').find(item => item.startsWith(`${TOKEN_COOKIE_KEY}=`))
  return entry ? decodeURIComponent(entry.slice(TOKEN_COOKIE_KEY.length + 1)) : undefined
}

/** 把 `purpose` 塞进 FormData（服务端从 body 读，不认 query） */
function withPurpose(formData: FormData, purpose?: UploadPurpose): FormData {
  if (purpose) formData.append('purpose', purpose)
  return formData
}

/**
 * 共享契约 → 模板遗留形状的**适配器**。
 *
 * 为什么保留旧形状：`~/types/file` 被 4 个 upload 组件与两个 composable 使用，
 * 一次全改会把"接上传接口"变成"重构上传组件"。适配器让这一步零风险。
 *
 * ⚠️ 后续该收掉的：旧形状**没有 id / size / mime**，而简历域需要它们
 *（比如把文件 id 写进文档、或在列表里显示大小）。等组件本身要改时，
 * 直接换成共享的 `UploadedFile`，删掉这个适配器。
 */
function toLegacyUploadedFile(row: SharedUploadedFile): UploadedFile {
  return {
    fileName: row.name,
    originalFilePath: row.url,
    thumbnailFilePath: null,
  }
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
    // ⚠️ **必须做形状转换**，不能 `as UploadedFile[]` 硬转：
    // 服务端返回的是共享契约 `{ id, url, name, size, mime, purpose }`，
    // 而模板遗留的 `~/types/file` 是 `{ fileName, originalFilePath, thumbnailFilePath }`。
    // 硬转不会报错，但消费方读 `fileName` 会拿到 `undefined` —— 又是一个"看起来通了"的坑。
    const rows = Array.isArray(payload.data) ? (payload.data as SharedUploadedFile[]) : []
    return rows.map(toLegacyUploadedFile)
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
  const { contentType = DEFAULT_CONTENT_TYPE, signal, onProgress, purpose } = options

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

    xhr.open('POST', uploadUrl(), true)
    // 新端点走全局 JWT Guard：不带头会 401（旧模板接口没有鉴权，所以这里原来是缺的）
    const token = readToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(withPurpose(toUploadFormData(input), purpose))
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
