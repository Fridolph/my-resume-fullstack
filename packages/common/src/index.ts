/**
 * 跨端共享的 API 契约（前端 `$request` 与后端 `apps/api` 共用同一套形状）。
 *
 * ## 唯一形状
 *
 * **成功与失败同形状**，只靠 `success` 区分。这是本仓与参考项目最大的差别：
 * 参考项目里正常返回走 interceptor、`HttpException` 走一个 filter、`UnauthorizedException`
 * 又走另一个 filter，三者输出形状互不相同（`{code,message,data,…}` / `{success,message}`），
 * 前端得为每种状态写一套解析 —— 那是"维护难"的主要来源。
 *
 * ## 字段说明
 *
 * - `timestamp`：ISO 字符串，便于前端显示"刚刚更新"与排查时序；
 * - `traceId`：链路追踪标识，由后端中间件从 `x-request-id` 透传或生成，成功与失败都会带上；
 * - `errorCode`：**机器可读**错误码（如 `AUTH.Token:expired`）。前端按它分支，**不要解析文案**
 *   —— 文案会改、会被翻译，靠文案做逻辑迟早出错。
 */

/** 统一成功响应体 */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  timestamp: string
  /** 链路追踪：由后端中间件写入（成功响应也会带） */
  traceId?: string
}

/** 统一错误响应体：与 `ApiResponse` 同形状，`success: false` + `data: null` */
export interface ApiErrorBody {
  success: false
  data: null
  message: string
  timestamp: string
  /** 请求路径 */
  path?: string
  statusCode: number
  /** 机器可读错误码；前端按它判断分支，不解析 `message` */
  errorCode?: string
  /** 链路追踪：出问题时可拿它去后端日志里定位这一次请求 */
  traceId?: string
}

export function createApiResponse<T>(data: T, message = 'ok', extra?: { traceId?: string }): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    ...(extra?.traceId ? { traceId: extra.traceId } : {}),
  }
}

export function createApiErrorBody(input: {
  message: string
  statusCode: number
  path?: string
  errorCode?: string
  traceId?: string
}): ApiErrorBody {
  return {
    success: false,
    data: null,
    message: input.message,
    timestamp: new Date().toISOString(),
    statusCode: input.statusCode,
    ...(input.path ? { path: input.path } : {}),
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input.traceId ? { traceId: input.traceId } : {}),
  }
}
