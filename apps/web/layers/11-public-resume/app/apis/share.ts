import type { ResumeDraftResponse } from '@rs/common'
import type { ShareExpiryOption } from '#layers/public-resume/app/config/share'

export interface ShareLinkCreated {
  id: string
  token: string
  expiresAt: string
  revokedAt: string | null
  allowAi: boolean
  allowPdf: boolean
  createdAt: string
}

/**
 * 分享链接的写接口。
 *
 * **只给选项或天数，不给时间戳** —— 上限（90 天）由服务端算，客户端算出来的时间戳一律不被信任。
 */
export function createShareApi() {
  const { $api } = useNuxtApp()
  return {
    /**
     * 访客按链接读简历（`/api/share/:token`）。
     *
     * `silent: true`：失效是**预期路径**之一（过期/撤销/未发布），不该触发全局错误提示 ——
     * 页面自己会把原因渲染出来。
     *
     * ⚠️ 返回的是 **`{ draft }`**，不是裸的 `ResumeDraftResponse` ——
     * `$api` 只解包最外层的 `{ code, data }`，`data` 里的 `draft` 仍然在。
     * 这里写错会在页面上表现成"取到了但渲染不出"（`undefined !== null` 恰为真），
     * 2026-10-22 实际踩过一次：页面 200、无报错、整页空白。
     */
    read: (token: string) =>
      $api<{ draft: ResumeDraftResponse }>(`/share/${encodeURIComponent(token)}`, { silent: true, retry: 0 }),
    create: (
      resumeId: number,
      input: { expiresIn: ShareExpiryOption; customDays?: number; allowAi?: boolean; allowPdf?: boolean },
    ) =>
      $api<ShareLinkCreated>(`/resume/${resumeId}/shares`, {
        method: 'POST',
        body: input,
        silent: true,
        retry: 0,
      }),
    revoke: (resumeId: number, shareId: string) =>
      $api<{ id: string; revokedAt: string }>(`/resume/${resumeId}/shares/${encodeURIComponent(shareId)}`, {
        method: 'DELETE',
        silent: true,
        retry: 0,
      }),
  }
}
