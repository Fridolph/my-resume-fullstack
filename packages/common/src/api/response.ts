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
