import type { CreateResumeDto, ResumeSummaryPage, SaveResumeDraftDto, ResumeDraftResponse } from '@rs/common'

export function createResumeDraftApi() {
  const { $api } = useNuxtApp()
  return {
    /** 默认展示的简历草稿（首页用它决定直接展示哪一份）；没设默认时 404 */
    findDefault: () => $api<ResumeDraftResponse>('/resume/default', { silent: true, retry: 0 }),
    /** 本人未删除的简历列表（工作台的入口用它）；**服务端分页** */
    list: (query: { page?: number; pageSize?: number } = {}) =>
      $api<ResumeSummaryPage>('/resume', { query, silent: true, retry: 0 }),
    create: (input: CreateResumeDto) =>
      $api<ResumeDraftResponse>('/resume', { method: 'POST', body: input, silent: true, retry: 0 }),
    read: (id: string) =>
      $api<ResumeDraftResponse>(`/resume/${encodeURIComponent(id)}/draft`, { silent: true, retry: 0 }),
    remove: (id: string) =>
      $api<{ id: number }>(`/resume/${encodeURIComponent(id)}`, { method: 'DELETE', silent: true, retry: 0 }),
    save: (id: string, input: SaveResumeDraftDto) =>
      $api<ResumeDraftResponse>(`/resume/${encodeURIComponent(id)}/draft`, {
        method: 'PUT',
        body: input,
        silent: true,
        retry: 0,
      }),
  }
}
