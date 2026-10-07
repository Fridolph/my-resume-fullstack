/** 后端统一响应格式（alova 插件会自动解包 data 字段） */
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

/** API 错误响应结构 */
export interface ApiErrorResponse {
  code: number
  msg: string
  data?: unknown
}
