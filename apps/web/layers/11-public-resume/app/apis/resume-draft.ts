import type { CreateResumeDto, ResumeSummary, SaveResumeDraftDto, ResumeDraftResponse } from '@rs/common'

export function createResumeDraftApi() {
  const { $api } = useNuxtApp()
  return {
    /** 本人未删除的简历列表（工作台的入口用它） */
    list: () => $api<ResumeSummary[]>('/resume', { silent: true, retry: 0 }),
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
