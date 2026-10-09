import {
  buildApiErrorHookNames,
  buildRequestHeaders,
  isApiSuccess,
  resolveApiErrorMessage,
  resolveApiErrorPolicy,
  TOKEN_COOKIE_KEY,
  toNormalizedApiError,
  type NormalizedApiError,
} from '@template/common'

/**
 * **唯一的请求层**（web 与 admin 共用 —— 两端都是前端，请求逻辑完全相同）。
 *
 * 注入 `$api`（Nuxt 官方的 `provide` 机制，与 `$fetch` 同级）：
 *
 * ```ts
 * const { $api } = useNuxtApp()
 * await $api('/health')
 * ```
 *
 * ⚠️ **为什么不是"替换全局 `$fetch`"**：Nuxt 把 `$fetch` 生成为 `#build/fetch.mjs` 的
 * **模块常量**（`export const $fetch = globalThis.$fetch`，求值时快照一次），而 Nuxt 内部
 * 早于任何插件 import 它 —— 所以插件里替换 `globalThis.$fetch` 对页面里的 `$fetch` 无效
 * （实测：页面 `$fetch` 仍打默认 baseURL）。官方的自定义入口就是 `provide`。
 *
 * 拦截里只做"每个调用点都要写、不写就是漏"的三件事：
 * 1. `onRequest`：注入鉴权头；
 * 2. `onResponse`：成功 → 解包 `data`；失败 → 归一化 + 按策略处理；
 * 3. `onResponseError`：HTTP / 网络失败同样归一化 + 处理。
 *
 * **公共错误默认自动处理**（策略表在 `@template/common`，两端一致）：401 清 token 并触发
 * `api:unauthorized`（宿主决定去哪登录）；403 / 404 / 5xx / 网络中断统一提示（带 traceId）。
 * 按接口跳过：`$api(url, { silent: true })`。设计见 `docs/web/05_请求错误处理_设计.md`。
 *
 * ⚠️ **统一走 `$api`，不要用裸 `$fetch` / `useFetch`**（它们不经这里）：
 * SSR 取数用 `useAsyncData(key, fetchXxx)`；缓存型查询用 colada 的 `useQuery`；
 * 两者都调用 `apis/*.ts` 里的函数，实例细节不外泄。
 */
export default defineNuxtPlugin(nuxtApp => {
  const tokenRef = useCookie<string | null>(TOKEN_COOKIE_KEY, { default: () => null })
  const toast = useToast()
  /** 各端声明自己的登录页（没配就只提示 + 触发 hook，由宿主接管） */
  const loginPath = String(useRuntimeConfig().public.loginPath || '')

  async function handleApiError(error: NormalizedApiError, level: { silent?: boolean; errorPolicy?: string }) {
    if (level.silent || level.errorPolicy === 'manual') {
      return
    }

    // 需要的人可以监听（按 code / errorCode 分了粒度）
    const callHook = nuxtApp.callHook as (name: string, ...args: unknown[]) => Promise<void>
    for (const name of buildApiErrorHookNames(error)) {
      await callHook(name, error)
    }

    const policy = resolveApiErrorPolicy(error)
    if (!policy.notify) {
      return
    }

    toast.add({
      title: resolveApiErrorMessage(error),
      description: error.traceId ? `traceId: ${error.traceId}` : undefined,
      color: 'error',
    })

    if (policy.action === 'redirect-login') {
      tokenRef.value = null
      await callHook('api:unauthorized', error)

      // 只在客户端跳转（SSR 阶段请求失败不该把整个渲染带跑）
      if (loginPath && import.meta.client) {
        await navigateTo(loginPath)
      }
    }
  }

  const $api = $fetch.create({
    baseURL: String(useRuntimeConfig().public.apiBase || '').replace(/\/$/, ''),

    onRequest({ options }) {
      const headers = new Headers(options.headers)
      Object.entries(buildRequestHeaders({ token: tokenRef.value })).forEach(([key, value]) => {
        headers.set(key, value)
      })
      options.headers = headers
    },

    async onResponse({ response, options }) {
      const payload = response._data as { code?: number; data?: unknown } | undefined

      if (response.ok && payload && isApiSuccess(payload)) {
        response._data = payload.data
        return
      }

      // ⚠️ 在这里 throw 不会再走 onResponseError，所以两条路径都要处理
      const error = toNormalizedApiError(payload as never, response.status)
      await handleApiError(error, options as { silent?: boolean; errorPolicy?: string })
      throw error
    },

    async onResponseError({ response, options }) {
      const error = toNormalizedApiError(response?._data as never, response?.status)
      await handleApiError(error, options as { silent?: boolean; errorPolicy?: string })
      throw error
    },
  })

  return {
    provide: { api: $api },
  }
})
