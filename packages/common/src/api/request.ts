/** 组装公共请求头（有值才带） */
export function buildRequestHeaders(ctx: { token?: string | null }): Record<string, string> {
  const headers: Record<string, string> = {}

  if (ctx.token) {
    headers.Authorization = `Bearer ${ctx.token}`
  }

  return headers
}

/**
 * 识别用户取消 / `AbortController` —— 上传进度里不当成失败处理。
 *
 * XHR 有时只把 abort 写在 `message` 里，所以除了 `name` 还要看文案。
 */
export function isAbortError(err: unknown): boolean {
  if (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  ) {
    return true
  }

  const message = err instanceof Error ? err.message : String(err || '')
  return /abort/i.test(message)
}
