import type { ApiErrorBody, ApiResponse } from '~/types/api'
import { applyApiErrorHooks, buildRequestHeaders, createApiError, TOKEN_COOKIE_KEY } from '~/utils/requestContext'

/**
 * 统一请求层：注入 `$request`（Nuxt `$fetch.create`）。
 *
 * 契约（与 `packages/common` 对齐）：
 * - HTTP 2xx 且 `success === true` → 解包 `data` 返回给调用方；
 * - 其余情况 → 抛出 `ApiError`（带 `statusCode` / `data`），并触发 `api:error[:statusCode]` hook。
 *
 * 数据层用法：colada 的 query / mutation 函数只调用 `$request`，
 * 不各自处理解包与错误分支（见 `~/apis/*` 与 `~/composables/*`）。
 */
export default defineNuxtPlugin(nuxtApp => {
  // 在插件 setup 阶段读取 cookie，得到响应式的 token ref；
  // 请求时再取值，避免在 onRequest 的异步上下文里调用 Nuxt composable。
  const tokenRef = useCookie<string | null>(TOKEN_COOKIE_KEY, { default: () => null })

  const $request = $fetch.create({
    baseURL: String(useRuntimeConfig().public.apiBase || '').replace(/\/$/, ''),

    onRequest({ options }) {
      const headers = new Headers(options.headers)
      Object.entries(buildRequestHeaders({ token: tokenRef.value })).forEach(([key, value]) => {
        headers.set(key, value)
      })
      options.headers = headers
    },

    onResponse({ response }) {
      const payload = response._data as ApiResponse<unknown> | ApiErrorBody | undefined

      if (response.ok && payload?.success === true) {
        response._data = payload.data
        return
      }

      throw createApiError({
        message: (payload as ApiErrorBody | undefined)?.message,
        statusCode: (payload as ApiErrorBody | undefined)?.statusCode ?? response.status,
        data: payload,
      })
    },

    async onResponseError({ response }) {
      const payload = (response?._data ?? {}) as ApiErrorBody

      await applyApiErrorHooks(payload, nuxtApp)
      throw createApiError({
        message: payload.message || response?.statusText,
        statusCode: payload.statusCode ?? response?.status,
        data: payload,
      })
    },
  })

  return {
    provide: {
      request: $request,
    },
  }
})
