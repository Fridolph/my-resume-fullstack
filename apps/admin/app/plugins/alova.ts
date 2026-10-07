import type { AlovaXHRResponse } from '@alova/adapter-xhr'
import type { ApiErrorResponse } from '~/types/api'
import { xhrRequestAdapter } from '@alova/adapter-xhr'
import { createAlova } from 'alova'
import NuxtHook from 'alova/nuxt'

/**
 * 上传专用 Alova 实例（参考 greensketch 的 app/plugins/alova.ts 精简）。
 *
 * - 用 XHR 适配器而非 fetch，才能拿到 `onUpload` 进度并配合 `abort()`。
 * - 上传不可复用进行中的请求，否则进度/取消会对错文件。
 * - 响应按 { code, msg, data } 解包：HTTP 2xx 且业务码 200 才返回 data。
 *
 * admin 模板暂无鉴权/分区 host，仅保留 baseURL + 业务码解包；接入真实后端时，
 * 参考 greensketch 在 `beforeRequest` 里补 token / 语言 / 分区 host。
 */
export default defineNuxtPlugin(() => {
  const apiBase = String(useRuntimeConfig().public.apiBase || '').replace(/\/$/, '')

  const alova = createAlova({
    statesHook: NuxtHook({ nuxtApp: useNuxtApp }),
    requestAdapter: xhrRequestAdapter(),
    shareRequest: false,
    cacheFor: null,
    cacheLogger: false,
    beforeRequest(method) {
      if (apiBase) {
        method.baseURL = apiBase
      }
      method.config.headers = {
        ...method.config.headers,
      }
    },
    responded: {
      async onSuccess(response: AlovaXHRResponse) {
        let payload = {} as ApiErrorResponse & { data?: unknown }
        const raw = response.data
        // XHR 上传常见响应是字符串，需要先 parse；对象则直接当业务包
        if (typeof raw === 'string') {
          try {
            payload = JSON.parse(raw || '{}') as ApiErrorResponse & { data?: unknown }
          }
          catch {
            throw new Error('Upload failed')
          }
        }
        else {
          payload = (raw ?? {}) as ApiErrorResponse
        }

        const code = Number(payload.code)
        const httpOk = response.status >= 200 && response.status < 300
        if (httpOk && code === 200) {
          return payload.data
        }

        throw new Error(payload.msg || 'Request failed')
      },
      onError(error) {
        throw error
      },
    },
  })

  return {
    provide: {
      alova,
    },
  }
})
