import type { ShareLinkDetail, ShareLinkListItem, ShareLinkStatus } from '@rs/common'
import type { PagedResult } from '@rs/common'

export interface ShareListFilters {
  page: number
  pageSize: number
  status?: ShareLinkStatus
  resumeId?: number
}

/**
 * 分享链接的管理接口（admin）。
 *
 * 与 web 的 `apis/share.ts` 分开：web 那份是"作者建链 + 访客读"，这份是"后台管理"。
 * 两者的权限面与路由都不同，合在一起会让调用点难以判断该用哪个。
 */
export function createShareAdminApi() {
  const { $api } = useNuxtApp()
  return {
    list: (filters: ShareListFilters) =>
      $api<PagedResult<ShareLinkListItem>>('/shares', { query: filters, silent: true, retry: 0 }),
    detail: (id: string) => $api<ShareLinkDetail>(`/shares/${encodeURIComponent(id)}`, { silent: true, retry: 0 }),
    update: (id: string, input: { label?: string | null; note?: string | null }) =>
      $api<ShareLinkListItem>(`/shares/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: input,
        silent: true,
        retry: 0,
      }),
    revoke: (id: string) =>
      $api<{ id: string; revokedAt: string }>(`/shares/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        silent: true,
        retry: 0,
      }),
  }
}

/** 状态标签的文案与颜色（只在这里定义一次，列表与详情共用） */
export const SHARE_STATUS_META: Record<ShareLinkStatus, { label: string; color: 'success' | 'warning' | 'error' }> = {
  active: { label: '有效', color: 'success' },
  expired: { label: '已过期', color: 'warning' },
  revoked: { label: '已撤销', color: 'error' },
}
