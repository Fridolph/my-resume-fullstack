import type { AlovaXHRResponse } from '@alova/adapter-xhr'
import { xhrRequestAdapter } from '@alova/adapter-xhr'
import { createAlova } from 'alova'
import NuxtHook from 'alova/nuxt'

/** 上传响应的宽松形状：后端 upload 接口尚未定稿，只做最小假设（对齐 packages/common 字段名） */
type UploadResponsePayload = { success?: boolean; message?: string; data?: unknown }

/**
 * 上传专用 Alova 实例（模板遗留，待迁移到 XHR + colada mutation）。
 *
 * - 用 XHR 适配器而非 fetch，才能拿到 `onUpload` 进度并配合 `abort()`。
 * - 上传不可复用进行中的请求，否则进度/取消会对错文件。
 * - 响应按 `{ success, data, message }`（packages/common）解包。
 *
 * 迁移计划见 docs/dev/data-layer.md 第 5、6 节：数据层统一到 `@pinia/colada` 后，
 * 本插件与 `apis/files.ts`、`useFileUploader` 一并替换为原生 XHR + colada mutation。
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
        let payload = {} as UploadResponsePayload
        const raw = response.data
        // XHR 上传常见响应是字符串，需要先 parse；对象则直接当业务包
        if (typeof raw === 'string') {
          try {
            payload = JSON.parse(raw || '{}') as UploadResponsePayload
          }
          catch {
            throw new Error('Upload failed')
          }
        }
        else {
          payload = (raw ?? {}) as UploadResponsePayload
        }

        const httpOk = response.status >= 200 && response.status < 300
        if (httpOk && payload.success === true) {
          return payload.data
        }

        throw new Error(payload.message || 'Request failed')
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
