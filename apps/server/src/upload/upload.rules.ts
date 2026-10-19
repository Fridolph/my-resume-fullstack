import {
  extensionForMime,
  UPLOAD_ALLOWED_MIMES,
  UPLOAD_MAX_FILE_BYTES,
  UPLOAD_PURPOSE_VALUES,
  type UploadPurpose,
} from '@rs/common'

/**
 * 上传的**纯规则**（没有 IO、没有 Nest 依赖），因此可以单测。
 *
 * 抽出来的理由：这些判断错了不会抛异常，只会"静默放过一个不该放的文件"
 * 或"静默拒绝一个合法文件"—— 前者是安全问题，后者是体验事故，都不该靠人肉回归。
 */

/**
 * 上传文件的最小结构（multer 内存文件里我们用到的字段）。
 *
 * 为什么不直接用 `Express.Multer.File`：那需要 `@types/multer`，
 * 而新增类型依赖要走 §2 的说明与批准。这里只声明用到的四个字段，
 * 拦截器给的真实对象结构上兼容（`buffer` 在内存存储下必有）。
 */
export interface UploadedFileLike {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

export interface UploadRejection {
  ok: false
  /** 给用户看的英文短因（会出现在 400 的 message 里） */
  reason: string
}

export interface UploadAccepted {
  ok: true
  mime: keyof typeof UPLOAD_ALLOWED_MIMES
  /** 落盘扩展名（由 MIME 反推，**不信任客户端文件名**） */
  ext: string
}

const ALLOWED_MIMES = new Set(Object.keys(UPLOAD_ALLOWED_MIMES))

/** 校验一个文件的类型与大小；通过则给出落盘扩展名 */
export function validateUpload(file: { mimetype: string; size: number }): UploadAccepted | UploadRejection {
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    return { ok: false, reason: `不支持的文件类型：${file.mimetype}` }
  }

  if (file.size <= 0) {
    return { ok: false, reason: '文件是空的' }
  }

  // ⚠️ 上层（multer）也设了 fileSize 上限，但**这一层必须再判一次**：
  // multer 的 limits 只在流式写入时截断，绕过它（比如未来换存储实现）就没有第二道闸。
  if (file.size > UPLOAD_MAX_FILE_BYTES) {
    return { ok: false, reason: `文件超过 ${Math.round(UPLOAD_MAX_FILE_BYTES / 1024 / 1024)} MB` }
  }

  const ext = extensionForMime(file.mimetype)
  if (!ext) {
    return { ok: false, reason: `无法确定文件扩展名：${file.mimetype}` }
  }

  return { ok: true, mime: file.mimetype as keyof typeof UPLOAD_ALLOWED_MIMES, ext }
}

/** 用途校验：不传时默认 `resume-asset`（最常用的那种），传了就必须在白名单里 */
export function normalizePurpose(purpose: string | undefined): UploadPurpose | undefined {
  if (!purpose) return 'resume-asset'

  return (UPLOAD_PURPOSE_VALUES as readonly string[]).includes(purpose) ? (purpose as UploadPurpose) : undefined
}

/**
 * 生成相对路径：`<purpose>/<YYYY>/<MM>/<uuid><ext>`。
 *
 * - **不用原始文件名**：防同名覆盖，也防 `../../` 这类路径穿越（原始名只进 DB 记录）
 * - **按日期分桶**：单目录几千个文件后备份与 `ls` 都会变慢
 * - **不按用户分目录**：路径是存储结构，不是权限结构；"谁传的"由 DB 的 `ownerId` 表达
 */
export function buildRelativePath(input: { purpose: UploadPurpose; ext: string; uuid: string; now: Date }): string {
  const year = input.now.getUTCFullYear()
  const month = String(input.now.getUTCMonth() + 1).padStart(2, '0')

  return `${input.purpose}/${year}/${month}/${input.uuid}${input.ext}`
}
