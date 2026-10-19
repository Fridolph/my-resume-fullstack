import type { UploadPurpose, UploadedFile } from '@rs/common'

/**
 * 上传接口（web 侧）。
 *
 * 用 `$api` 而不是原生 XHR：web 这里不需要进度条与取消（头像 / 背景图都是几百 KB），
 * 而 `$api` 已经**自动带 Authorization**、统一错误解包与 traceId —— 手写 XHR 反而要自己补。
 * （admin 那边保留 XHR 是因为它要进度条与 abort，见 `apps/admin/app/apis/files.ts`。）
 */
export function createUploadApi() {
  const { $api } = useNuxtApp()

  return {
    /**
     * 上传单个文件。
     *
     * 业务上一次传一个（服务端允许 10 个，但逐个传的失败粒度更小：
     * 一个图选错了，不会让整批都白等）。
     */
    async upload(file: File, purpose: UploadPurpose): Promise<UploadedFile> {
      const formData = new FormData()
      formData.append('files', file)
      formData.append('purpose', purpose)

      const uploaded = await $api<UploadedFile[]>('/upload/files', {
        method: 'POST',
        body: formData,
        silent: true,
        retry: 0,
      })

      const first = uploaded[0]
      if (!first) throw new Error('上传失败：没有返回文件')
      return first
    },
  }
}
