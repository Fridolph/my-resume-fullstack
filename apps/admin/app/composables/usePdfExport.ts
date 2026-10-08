import type { PdfExportPayload } from '~/types/pdf'
import { requestPdfExport } from '~/apis/pdf'

export type PdfExportStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UsePdfExportOptions {
  /** 导出成功回调；不传则默认跳转 fileUrl 下载 */
  onSuccess?: (fileUrl: string) => void
  /** 导出失败回调（如弹 toast） */
  onError?: (error: unknown) => void
}

/**
 * PDF 导出：
 *
 * - **后端导出（生产推荐）**：`exportPdf()` → 把当前预览页 URL 交给后端，
 *   后端无头浏览器渲染后返回文件 URL → 跳转下载。详见 `apis/pdf.ts` 的接口约定。
 * - **前端降级**：`printPdf()` → 调起浏览器打印（「另存为 PDF」），
 *   后端未接入时可用，版式由 `assets/css/main.css` 的打印规则保证。
 *
 * 两种方式共用同一份 `PdfDocConfig`，导出结果一致。
 *
 * @example
 * const { isPending, exportPdf, printPdf } = usePdfExport({ onError: showToast })
 * // 后端可用时：
 * await exportPdf({ url: useRequestURL().href, scene: 'resume', fileName: 'resume' })
 * // 降级：
 * printPdf()
 */
export function usePdfExport(options: UsePdfExportOptions = {}) {
  const status = ref<PdfExportStatus>('idle')
  const fileUrl = ref<string | null>(null)
  const error = ref<unknown>(null)
  const isPending = computed(() => status.value === 'pending')

  /** 请求后端生成并下载 PDF；失败时置为 error 状态并回调 onError */
  async function exportPdf(payload: PdfExportPayload): Promise<string | null> {
    status.value = 'pending'
    error.value = null

    try {
      const url = await requestPdfExport(payload)
      fileUrl.value = url
      status.value = 'success'

      if (options.onSuccess) {
        options.onSuccess(url)
      } else if (url) {
        // 后端返回对象存储地址，直接跳转触发浏览器下载
        await navigateTo(url, { external: true })
      }

      return url
    } catch (e) {
      error.value = e
      status.value = 'error'
      options.onError?.(e)
      return null
    }
  }

  /** 前端降级：浏览器打印（另存为 PDF） */
  function printPdf() {
    if (import.meta.client) {
      window.print()
    }
  }

  return { status, isPending, fileUrl, error, exportPdf, printPdf }
}
