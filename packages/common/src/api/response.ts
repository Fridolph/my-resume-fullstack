import { API_CODE } from './constants.js'
import type { ApiErrorBody, ApiSuccessBody } from './types.js'

/** 构造成功响应体（后端 `apps/server` 与前端 mock 共用） */
export function createApiResponse<T>(data: T, message = 'ok', extra?: { traceId?: string }): ApiSuccessBody<T> {
  return {
    code: API_CODE.OK,
    data,
    message,
    timestamp: new Date().toISOString(),
    ...(extra?.traceId ? { traceId: extra.traceId } : {}),
  }
}

/** 构造失败响应体（同形状，`data` 为 `null`） */
export function createApiErrorBody(input: {
  message: string
  code: number
  path?: string
  errorCode?: string
  traceId?: string
}): ApiErrorBody {
  return {
    code: input.code,
    data: null,
    message: input.message,
    timestamp: new Date().toISOString(),
    ...(input.path ? { path: input.path } : {}),
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input.traceId ? { traceId: input.traceId } : {}),
  }
}

/**
 * 判断一次响应是否成功 —— 前端**统一走这里**，不要自己去比数字。
 *
 * 为什么留这个函数：成功与失败的边界将来可能调整（比如引入 2xx 段里的 204 表示"成功但无数据"），
 * 收在一个函数里改一次即可；散落成 `payload.code === 200` 就会有人漏改。
 */
export function isApiSuccess(payload: { code?: number } | undefined | null): boolean {
  return typeof payload?.code === 'number' && payload.code >= 200 && payload.code < 300
}
