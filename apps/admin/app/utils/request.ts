/**
 * 识别用户取消 / AbortController，上传进度里不当成失败处理。
 */
export function isAbortError(err: unknown): boolean {
  if ((err instanceof DOMException && err.name === 'AbortError')
    || (err instanceof Error && err.name === 'AbortError')) {
    return true
  }
  // Alova / XHR 有时只把 abort 写在 message 里
  const message = err instanceof Error ? err.message : String(err || '')
  return /abort/i.test(message)
}
