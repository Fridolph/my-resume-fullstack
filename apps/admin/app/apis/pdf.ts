import type { PdfExportPayload } from '~/types/pdf'

/**
 * 后端 PDF 导出接口。
 *
 * 接入后端时按实际路由调整：greensketch 用的是
 * `POST /sketch/share/project/download`，请求体 `{ url, outerId, designId, labelId, scene }`，
 * 响应体是**可直接下载的 PDF 文件 URL**（字符串）。
 *
 * 后端约定（无头浏览器渲染）：
 * 1. 接收目标页面完整 URL（即前端这个预览页地址）；
 * 2. 用 puppeteer / playwright 打开它，等待「就绪锚点」
 *    —— 由 `usePdfRenderState()` 的 `ready` 控制，确保页码已写入 DOM 再截图；
 * 3. 生成 PDF（A4，命名页 portrait/landscape 已在 main.css 定义）并上传对象存储；
 * 4. 返回文件 URL，前端跳转下载。
 *
 * 注意：请求会带上 `utils/requestContext` 的公共头，鉴权与分区由请求层统一处理。
 */
export const PDF_EXPORT_ENDPOINT = '/pdf/download'

/** 请求后端生成 PDF，返回文件下载地址 */
export async function requestPdfExport(payload: PdfExportPayload): Promise<string> {
  const { $api } = useNuxtApp()

  // httpRequest 插件已解包 { code, msg, data }，这里拿到的就是 data（文件 URL）
  return await $api<string>(PDF_EXPORT_ENDPOINT, {
    method: 'POST',
    body: payload,
  })
}
