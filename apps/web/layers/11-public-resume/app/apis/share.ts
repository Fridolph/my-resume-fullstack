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
