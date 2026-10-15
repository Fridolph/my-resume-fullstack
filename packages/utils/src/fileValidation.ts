/** UFileUpload / input 可能给出的文件形态 */
export type FileUploadInput = File | File[] | FileList | null | undefined

/** 校验失败原因 */
export type FileRuleCode = 'empty' | 'too_large' | 'unsupported_type' | 'too_many' | 'invalid_dimensions'

/** 单次校验失败信息（admin 无 i18n，messageKey 直接放可展示文案） */
export interface FileRuleIssue {
  code: FileRuleCode
  messageKey: string
  file?: File
  index?: number
}

/** 规则执行时的上下文：当前文件、下标、整批文件 */
export interface FileRuleContext {
  file: File
  index: number
  files: File[]
}

/** `true` 表示通过，否则返回失败信息 */
export type FileRuleResult = true | FileRuleIssue

/** 单文件校验规则，可同步或异步（如读取图片尺寸） */
export type FileRule = (ctx: FileRuleContext) => FileRuleResult | Promise<FileRuleResult>

/** 图片宽高约束；未设置的项不检查 */
export interface ImageDimensionOptions {
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  /** 宽 / 高，例如 16/9 */
  aspectRatio?: number
  /** 宽高比允许误差，默认 0.01 */
  aspectRatioTolerance?: number
}

/** accept 中表示不限制类型的写法 */
const ACCEPT_ALL = new Set(['*', '*/*'])

/** 扩展名 → MIME，用于 `file.type` 为空时的回退 */
const EXT_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
}

/** 已知图片扩展名，从 EXT_MIME 中筛出 */
const IMAGE_EXTS = new Set(
  Object.entries(EXT_MIME)
    .filter(([, mime]) => mime.startsWith('image/'))
    .map(([ext]) => ext),
)

/** 把 File / File[] / FileList / 空值统一成 File[] */
export function normalizeFileInput(input: FileUploadInput): File[] {
  if (!input) {
    return []
  }
  if (input instanceof File) {
    return [input]
  }
  if (Array.isArray(input)) {
    return input.filter((file): file is File => file instanceof File)
  }
  if (typeof FileList !== 'undefined' && input instanceof FileList) {
    return Array.from(input)
  }
  return []
}

/**
 * 解析 accept：支持数组或逗号分隔字符串（与 input[accept] 一致）。
 * @returns 小写、去空后的规则列表
 */
export function parseAccept(accept: string | string[] | undefined): string[] {
  if (!accept) {
    return []
  }
  const list = Array.isArray(accept) ? accept : accept.split(',')
  return list.map(item => item.trim().toLowerCase()).filter(Boolean)
}

/** 取文件扩展名，含点，如 `.pdf`；没有扩展名则返回空字符串 */
export function getFileExt(file: File): string {
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

/**
 * 解析文件 MIME。
 * `file.type` 为空时（部分系统拖拽文件会出现）按扩展名回退。
 */
export function resolveFileMime(file: File): string {
  const mime = (file.type || '').toLowerCase()
  if (mime) {
    return mime
  }
  return EXT_MIME[getFileExt(file)] || ''
}

/** 是否按 MIME 或扩展名识别为图片 */
export function isImageFile(file: File): boolean {
  const mime = resolveFileMime(file)
  if (mime.startsWith('image/')) {
    return true
  }
  return IMAGE_EXTS.has(getFileExt(file))
}

/** 匹配完整 MIME，或主类型通配（如 `image` + `/*`） */
function mimeMatches(fileMime: string, rule: string): boolean {
  if (rule.endsWith('/*')) {
    const base = rule.slice(0, rule.indexOf('/'))
    return Boolean(base) && fileMime.startsWith(`${base}/`)
  }
  return fileMime === rule
}

/**
 * 文件是否命中 accept。
 * 规则可以是完整 MIME、主类型通配、或扩展名（如 `.pdf`）。
 * accept 为空 / `*` 视为不限制。
 */
export function isAcceptedType(file: File, accept: string | string[] | undefined): boolean {
  const rules = parseAccept(accept)
  if (rules.length === 0 || rules.some(rule => ACCEPT_ALL.has(rule))) {
    return true
  }

  const mime = resolveFileMime(file)
  const ext = getFileExt(file)

  return rules.some(rule => {
    if (rule.startsWith('.')) {
      return ext === rule
    }
    return Boolean(mime) && mimeMatches(mime, rule)
  })
}

/** 格式规则：MIME、通配或扩展名不匹配则失败 */
export function fileTypeRule(accept: string | string[]): FileRule {
  return ({ file, index }) => {
    if (isAcceptedType(file, accept)) {
      return true
    }
    return {
      code: 'unsupported_type',
      messageKey: 'Unsupported file type',
      file,
      index,
    }
  }
}

/** 体积规则：单个文件超过 maxBytes 则失败 */
export function fileSizeRule(maxBytes: number): FileRule {
  return ({ file, index }) => {
    if (file.size <= maxBytes) {
      return true
    }
    return {
      code: 'too_large',
      messageKey: 'File exceeds the size limit',
      file,
      index,
    }
  }
}

/**
 * 数量规则：整批超过 maxCount 则失败。
 * 只在 index === 0 时检查一次，避免对每个文件重复报错。
 */
export function fileCountRule(maxCount: number): FileRule {
  return ({ index, files }) => {
    if (index > 0 || files.length <= maxCount) {
      return true
    }
    return {
      code: 'too_many',
      messageKey: 'Too many files',
    }
  }
}

/**
 * 读取图片像素宽高。
 * 优先 `createImageBitmap`，失败再走 `Image` + object URL。
 */
export async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      if (size.width > 0 && size.height > 0) {
        return size
      }
    } catch {
      // fallback below
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('Failed to read image size'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * 图片尺寸规则：最小/最大宽高、可选宽高比。
 * 非图片文件直接跳过，便于和其它规则组合。
 */
export function imageDimensionRule(options: ImageDimensionOptions): FileRule {
  const { minWidth, minHeight, maxWidth, maxHeight, aspectRatio, aspectRatioTolerance = 0.01 } = options

  return async ({ file, index }) => {
    if (!isImageFile(file)) {
      return true
    }

    try {
      const { width, height } = await readImageSize(file)
      const tooSmall = (minWidth != null && width < minWidth) || (minHeight != null && height < minHeight)
      const tooLarge = (maxWidth != null && width > maxWidth) || (maxHeight != null && height > maxHeight)
      const ratioInvalid =
        aspectRatio != null && height > 0 && Math.abs(width / height - aspectRatio) > aspectRatioTolerance

      if (tooSmall || tooLarge || ratioInvalid) {
        return {
          code: 'invalid_dimensions',
          messageKey: 'Invalid image dimensions',
          file,
          index,
        }
      }
      return true
    } catch {
      return {
        code: 'invalid_dimensions',
        messageKey: 'Invalid image dimensions',
        file,
        index,
      }
    }
  }
}

/**
 * 按顺序执行规则：任一文件、任一规则失败即返回，全部通过返回 `null`。
 */
export async function validateFiles(files: File[], rules: FileRule[]): Promise<FileRuleIssue | null> {
  if (files.length === 0) {
    return { code: 'empty', messageKey: 'Please select a file' }
  }

  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    if (!file) {
      continue
    }
    for (const rule of rules) {
      const result = await rule({ file, index, files })
      if (result !== true) {
        return result
      }
    }
  }

  return null
}
