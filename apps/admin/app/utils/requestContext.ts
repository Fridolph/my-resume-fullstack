import type { ApiErrorResponse } from '~/types/api'

/**
 * 请求上下文（参考 greensketch 的 app/utils/requestContext.ts，按 admin 精简）。
 *
 * admin 模板暂无鉴权 / 多地区 / i18n，这里只保留：
 * - host 映射（`base` / `greenet` 两个分区）
 * - 公共请求头（版本 / 语言 / 国家 / token，有值才带）
 * - 统一错误工具（`createApiError` / `getApiError*` / `applyApiErrorHooks`）
 *
 * `$request`（ofetch）与 `$alova`（上传）共用本文件，保证鉴权 / 分区 / 错误处理一致。
 */

export type RequestHostType = 'base' | 'greenet'

export interface LocaleRequestInfo {
  lang?: string
  countryCode?: string
}

/** 一次请求所需的上下文 */
export interface RequestContext {
  isLoggedIn: boolean
  token: string
  localeInfo: LocaleRequestInfo | undefined
  webVersion: string
  hostMap: Record<RequestHostType, string>
}

/** 登录 token 存 cookie 的 key（接入 auth 时对齐） */
export const TOKEN_COOKIE_KEY = 'gs.token'

/** runtimeConfig 里的各分区 API 根地址 */
export function getApiHostMap(): Record<RequestHostType, string> {
  const config = useRuntimeConfig().public as Record<string, string | undefined>
  const base = config.apiBase || ''
  return {
    base,
    greenet: config.apiBaseGreenet || base,
  }
}

/** 按路径选区 host：`/greenet/` 走 greenet，其余走 base */
export function resolveHostType(ctx: { path: string }): RequestHostType {
  return ctx.path.startsWith('/greenet/') ? 'greenet' : 'base'
}

/** 从 runtimeConfig / cookie 收集当前请求上下文 */
export function resolveRequestContext(): RequestContext {
  const config = useRuntimeConfig().public as Record<string, string | undefined>
  const token = useCookie<string | null>(TOKEN_COOKIE_KEY, { default: () => null }).value || ''

  return {
    isLoggedIn: !!token,
    token,
    localeInfo: undefined,
    webVersion: `v${config.version || '0'} (${config.commit || 'dev'})`,
    hostMap: getApiHostMap(),
  }
}

/** 去掉末尾 `/`，避免和路径拼出 `//path` */
export function resolveRequestBaseURL(path: string, ctx = resolveRequestContext()): string {
  return String(ctx.hostMap[resolveHostType({ path })] || '').replace(/\/$/, '')
}

/** 组装公共请求头（有值才带） */
export function buildRequestHeaders(
  path: string,
  ctx = resolveRequestContext(),
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Web-Version': ctx.webVersion,
  }

  if (ctx.localeInfo?.lang) {
    headers['Accept-Language'] = ctx.localeInfo.lang
  }
  if (ctx.localeInfo?.countryCode) {
    headers['Current-Country-Code'] = ctx.localeInfo.countryCode
  }
  if (ctx.isLoggedIn && ctx.token) {
    headers.Authorization = ctx.token
  }

  return headers
}

/** 把业务错误包装成可读的 ApiError，调用方可以读 code / msg / data */
export function createApiError(payload: { msg?: string, code?: number, data?: unknown }) {
  const code = payload.code
  const msg = payload.msg || 'Request failed'
  const label = code != null ? `[API ${code}] ${msg}` : `[API] ${msg}`
  const error = new Error(label) as Error & {
    name: string
    data: typeof payload
    statusCode?: number
  }
  error.name = 'ApiError'
  error.data = payload
  if (typeof code === 'number' && Number.isFinite(code)) {
    error.statusCode = code
  }
  return error
}

/** 从未知 err 上取出业务 payload */
export function getApiErrorData(err: unknown): { msg?: string, code?: number, data?: unknown } | undefined {
  if (!err || typeof err !== 'object') {
    return undefined
  }
  const data = (err as { data?: unknown }).data
  if (data && typeof data === 'object') {
    return data as { msg?: string, code?: number, data?: unknown }
  }
  return undefined
}

/** 控制台 / toast 用的短文案 */
export function getApiErrorMessage(err: unknown, fallback = 'Error') {
  const data = getApiErrorData(err)
  if (typeof data?.msg === 'string' && data.msg) {
    return data.msg
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return fallback
}

/** 按业务码触发 Nuxt hook，方便全局弹 toast / 跳登录 */
export async function applyApiErrorHooks(
  payload: ApiErrorResponse,
  nuxtApp: ReturnType<typeof useNuxtApp>,
) {
  const code = Number(payload.code)
  const known = [400, 401, 403, 500, 502, 503, 504]
  const hook = (known.includes(code) ? `api:error:${code}` : 'api:error') as any
  await nuxtApp.callHook(hook, payload as any)
}
