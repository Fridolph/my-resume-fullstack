/**
 * 上传契约（**共享层**）：两端都要用同一份形状与同一套限制。
 *
 * ## 为什么限制写在共享层
 *
 * 客户端校验只是体验（选了 20MB 的图，与其传完再说"太大"，不如当场提示）；
 * **服务端才是边界**。两份数字写在不同地方必然漂移 —— 于是前端放行、后端拒绝，
 * 用户看到的是"选完就报错"。所以：一份常量，两端各用一次，后端那次是强制的。
 */

/** 上传用途 —— 决定磁盘一级目录，也是将来按用途清理/配额的依据 */
export const UPLOAD_PURPOSES = {
  /** 头像 */
  avatar: 'avatar',
  /** 简历导入（解析用） */
  resumeImport: 'resume-import',
  /** 简历内的素材（封面、头图、画廊） */
  resumeAsset: 'resume-asset',
} as const

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[keyof typeof UPLOAD_PURPOSES]

export const UPLOAD_PURPOSE_VALUES: readonly UploadPurpose[] = Object.values(UPLOAD_PURPOSES)

/**
 * MIME 白名单（Owner 2026-10-15：图片只放 png / jpeg）。
 *
 * 用 **MIME** 而不是扩展名做判定，但落盘时的扩展名由 MIME 反推（见 `extensionForMime`）——
 * 只看扩展名等于相信客户端；只用 MIME 又会让落盘文件名失去可读扩展名。
 */
export const UPLOAD_ALLOWED_MIMES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/pdf': '.pdf',
  'text/markdown': '.md',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
} as const

export type UploadMime = keyof typeof UPLOAD_ALLOWED_MIMES

/** 单文件上限：5 MB */
export const UPLOAD_MAX_FILE_BYTES = 5 * 1024 * 1024
/** 单次请求上限：10 个（Owner：接口允许多文件，业务上引导一次一个） */
export const UPLOAD_MAX_FILES = 10

/** 由 MIME 反推落盘扩展名；不在白名单返回 undefined */
export function extensionForMime(mime: string): string | undefined {
  return (UPLOAD_ALLOWED_MIMES as Record<string, string>)[mime]
}

/** 一个已上传的文件（`POST /api/upload/files` 的 `data` 项） */
export interface UploadedFile {
  id: number
  /** 可公开访问的 URL（形如 `/static/upload/avatar/2026/10/<uuid>.png`） */
  url: string
  /** 原始文件名（只用于展示与下载命名，不参与落盘路径） */
  name: string
  size: number
  mime: string
  purpose: UploadPurpose
}
