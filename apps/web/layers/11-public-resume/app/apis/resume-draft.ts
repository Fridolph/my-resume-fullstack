import type { CreateResumeDto, SaveResumeDraftDto, ResumeDraftResponse } from '@rs/common'

export function createResumeDraftApi() {
  const { $api } = useNuxtApp()
  return {
    create: (input: CreateResumeDto) =>
      $api<ResumeDraftResponse>('/resume', { method: 'POST', body: input, silent: true, retry: 0 }),
    read: (id: string) =>
      $api<ResumeDraftResponse>(`/resume/${encodeURIComponent(id)}/draft`, { silent: true, retry: 0 }),
    save: (id: string, input: SaveResumeDraftDto) =>
      $api<ResumeDraftResponse>(`/resume/${encodeURIComponent(id)}/draft`, {
        method: 'PUT',
        body: input,
        silent: true,
        retry: 0,
      }),
  }
}
