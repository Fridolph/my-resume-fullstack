import type { ApiErrorResponse } from '~/types/api'
import { tryit } from 'radashi'
import {
  applyApiErrorHooks,
  buildRequestHeaders,
  createApiError,
  getApiHostMap,
  resolveHostType,
} from '~/utils/requestContext'

/**
 * ofetch 只在 HTTP status ∈ [400, 600) 时调用 onResponseError。
 * 后端常返回 HTTP 200 + body.code !== 200，因此用业务码覆盖 response.status，
 * 非 4xx/5xx 的业务码映射为 400，才能进入错误分支。
 */
function markResponseAsBusinessError(response: { status: number }, businessCode: number) {
  const status = businessCode >= 400 && businessCode < 600 ? businessCode : 400

  const [err] = tryit(() => {
    Object.defineProperty(response, 'status', {
      configurable: true,
      enumerable: true,
      get: () => status,
    })
  })()

  // 个别运行时 status 不可重定义时退回赋值
  if (err) {
    ;(response as { status: number }).status = status
  }
}

/**
 * 统一请求层（参考 greensketch 的 app/plugins/httpRequest.ts，按 admin 精简）。
 *
 * - 注入 `$request`（Nuxt `$fetch.create`）
 * - 按路径选分区 host + 组装公共请求头
 * - 业务码 `{ code, msg, data }`：HTTP 2xx 且 code 200 才解包 data，否则进错误分支
 * - 错误统一走 `api:error:<code>` hook（在 demo 或全局注册监听）
 */
export default defineNuxtPlugin((nuxtApp) => {
  const HOST_MAP = getApiHostMap()

  const $request = $fetch.create({
    baseURL: HOST_MAP.base,

    onRequest(ctx) {
      const { request, options } = ctx
      const requestPath = String(request)

      const headers = buildRequestHeaders(requestPath)
      options.headers = options.headers || new Headers()
      Object.entries(headers).forEach(([key, value]) => {
        if (value) {
          options.headers.set(key, value)
        }
      })

      options.baseURL = HOST_MAP[resolveHostType({ path: requestPath })]
    },

    async onResponse({ response }) {
      const payload = response._data as ApiErrorResponse & { data?: unknown } | undefined
      const responseCode = Number(payload?.code)

      // 成功：解包 data
      if (responseCode === 200) {
        response._data = payload?.data
        return
      }

      // 业务失败：规范化 msg，并把 HTTP status 改成业务码，让 ofetch 走进 onResponseError
      if (payload && typeof payload === 'object') {
        const msg = typeof payload.msg === 'string' && !payload.msg.startsWith('error.')
          ? `error.${payload.msg}`
          : payload.msg
        response._data = { ...payload, msg }
      }

      if (Number.isFinite(responseCode) && responseCode !== 200) {
        markResponseAsBusinessError(response, responseCode)
        return
      }

      throw createApiError(response._data || { msg: 'Request failed' })
    },

    async onResponseError({ response }) {
      const payload = (response?._data || {
        code: response?.status,
        msg: response?.statusText || 'Request failed',
      }) as ApiErrorResponse

      await applyApiErrorHooks(payload, nuxtApp)
      throw createApiError(payload)
    },
  })

  return {
    provide: {
      request: $request,
    },
  }
})
