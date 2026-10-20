import type { ResumePdfConfigResponse, ResumePdfConfigUpdateDto } from '@rs/common'

/** 本人公共预设独立于简历ID，供设置页与PDF面板共同消费。 */
export function createResumePdfPresetApi() {
  const { $api } = useNuxtApp()
  return {
    loadPreset: () => $api<ResumePdfConfigResponse>('/resume/pdf-preset', { silent: true, retry: 0 }),
    savePreset: (input: ResumePdfConfigUpdateDto) =>
      $api<ResumePdfConfigResponse>('/resume/pdf-preset', { method: 'PATCH', body: input, silent: true, retry: 0 }),
  }
}

/** 本人配置能力由后端检查；UI 只消费显式注入的回调。 */
export function createResumePdfConfigApi(id: () => number, editable: () => boolean) {
  const { $api } = useNuxtApp()
  const presetApi = createResumePdfPresetApi()
  return {
    loadPreset: presetApi.loadPreset,
    loadConfig: () => $api<ResumePdfConfigResponse>(`/resume/${id()}/pdf-config`, { silent: true, retry: 0 }),
    ...(editable()
      ? {
          savePreset: presetApi.savePreset,
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
