import type { ApiErrorBody, ApiResponse } from '~/types/api'
import { applyApiErrorHooks, buildRequestHeaders, createApiError, TOKEN_COOKIE_KEY } from '~/utils/requestContext'

/**
 * 统一请求层：注入 `$request`（Nuxt `$fetch.create`）。
 *
 * 契约（与 `packages/common` 对齐）：
 * - HTTP 2xx 且 `success === true` → 解包 `data` 返回给调用方；
 * - 其余情况 → 抛出 `ApiError`（带 `statusCode` / `data`），并触发 `api:error[:statusCode]` hook。
 */
export default defineNuxtPlugin(nuxtApp => {
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
