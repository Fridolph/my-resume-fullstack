import type { ResumePdfConfigResponse, ResumePdfConfigUpdateDto } from '@rs/common'

/** 本人配置能力由后端检查；UI 只消费显式注入的回调。 */
export function createResumePdfConfigApi(id: () => number, editable: () => boolean) {
  const { $api } = useNuxtApp()
  return {
    loadPreset: () => $api<ResumePdfConfigResponse>('/resume/pdf-preset', { silent: true, retry: 0 }),
    loadConfig: () => $api<ResumePdfConfigResponse>(`/resume/${id()}/pdf-config`, { silent: true, retry: 0 }),
    ...(editable()
      ? {
          savePreset: (input: ResumePdfConfigUpdateDto) =>
            $api<ResumePdfConfigResponse>('/resume/pdf-preset', {
              method: 'PATCH',
              body: input,
              silent: true,
              retry: 0,
            }),
          saveConfig: (input: ResumePdfConfigUpdateDto) =>
            $api<ResumePdfConfigResponse>(`/resume/${id()}/pdf-config`, {
              method: 'PATCH',
              body: input,
              silent: true,
              retry: 0,
            }),
        }
      : {}),
  }
}
