import {
  API_ERROR_CODE_MESSAGES,
  API_ERROR_MESSAGES,
  API_ERROR_POLICY,
  FALLBACK_ERROR_POLICY,
  NETWORK_ERROR_CODE,
  UNKNOWN_ERROR_MESSAGE,
} from './constants.js'
import type { ApiErrorBody, ApiErrorPolicy, NormalizedApiError } from './types.js'

/**
 * 请求错误的**归一化与策略**（纯函数，不依赖任何框架 —— 可单测、两端复用）。
 *
 * - **归一化**：业务错误 / HTTP 错误 / 网络中断统一成 `NormalizedApiError`；
 * - **策略**：`API_ERROR_POLICY` 决定"要不要提示 / 要不要跳登录"（默认全静默）；
 * - **文案**：`errorCode` 优先于 `code`，都不命中才退回后端 `message`。
 *
 * ⚠️ 本文件**不触发 hook、不弹提示** —— 那是宿主（Nuxt 环境）的事：
 * hook 名由 `buildApiErrorHookNames()` 给出，提示由 `useApiErrorToast()` 做。
 */

export function isNormalizedApiError(err: unknown): err is NormalizedApiError {
  return (
    Boolean(err) &&
    typeof err === 'object' &&
    typeof (err as NormalizedApiError).code === 'number' &&
    typeof (err as NormalizedApiError).isNetworkError === 'boolean'
  )
}

/**
 * 后端失败体 / 网络异常 → 统一形状（请求层的 `onResponse` 与 `onResponseError` 都走它）。
 *
 * 判定网络失败的依据是"既没有 payload 也没有 HTTP 状态" —— 那时 `code` 记为 0。
 */
export function toNormalizedApiError(payload: ApiErrorBody | undefined, httpStatus?: number): NormalizedApiError {
  const isNetworkError = !payload && httpStatus == null

  return {
    code: isNetworkError ? NETWORK_ERROR_CODE : (payload?.code ?? httpStatus ?? NETWORK_ERROR_CODE),
    errorCode: payload?.errorCode,
    message: payload?.message || (isNetworkError ? '网络异常' : UNKNOWN_ERROR_MESSAGE),
    traceId: payload?.traceId,
    path: payload?.path,
    isNetworkError,
  }
}

/** 任意抛出的错误 → 统一形状（调用方 catch 到的可能是请求层抛的，也可能是别人抛的） */
export function normalizeApiError(err: unknown): NormalizedApiError {
  if (isNormalizedApiError(err)) {
    return err
  }

  // 请求层抛的是带 `data` 的 Error（兼容旧形状）
  const carrier = err as { data?: ApiErrorBody; statusCode?: number } | undefined
  if (carrier?.data && typeof carrier.data === 'object') {
    return toNormalizedApiError(carrier.data, carrier.statusCode)
  }

  return {
    code: NETWORK_ERROR_CODE,
    message: err instanceof Error && err.message ? err.message : UNKNOWN_ERROR_MESSAGE,
    isNetworkError: true,
  }
}

export function resolveApiErrorPolicy(err: NormalizedApiError): ApiErrorPolicy {
  return API_ERROR_POLICY[err.code] ?? FALLBACK_ERROR_POLICY
}

/** 可展示文案：`errorCode` 优先 → `code` → 后端 message → 兜底 */
export function resolveApiErrorMessage(err: NormalizedApiError): string {
  const byErrorCode = err.errorCode ? API_ERROR_CODE_MESSAGES[err.errorCode] : undefined
  if (byErrorCode) {
    return byErrorCode
  }

  return API_ERROR_MESSAGES[err.code] ?? err.message ?? UNKNOWN_ERROR_MESSAGE
}

/** 带 `traceId` 的完整文案（排查用：出问题时报给后端） */
export function resolveApiErrorDetail(err: NormalizedApiError): string {
  return err.traceId ? `${resolveApiErrorMessage(err)}（traceId: ${err.traceId}）` : resolveApiErrorMessage(err)
}

/**
 * 构造要触发的 hook 名（通用 + 按 `code` + 按 `errorCode`）。
 *
 * 纯函数：宿主拿到名字后自己 `callHook`（这样 `common` 不需要认识 Nuxt）。
 * **默认没有监听者**，所以它天然是静默的。
 */
export function buildApiErrorHookNames(err: NormalizedApiError): string[] {
  const names = ['api:error', `api:error:${err.code}`]
  if (err.errorCode) {
    names.push(`api:error:${err.errorCode}`)
  }

  return names
}
