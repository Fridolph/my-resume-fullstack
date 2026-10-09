/**
 * 跨端共享的 API 契约（前端 `$request` / `httpRequest` 与后端 `apps/api` 共用）。
 *
 * ## 唯一形状
 *
 * **成功与失败同形状**，只靠 `code` 区分。这是本仓与参考项目最大的差别：
 * 参考项目里正常返回走 interceptor、`HttpException` 走一个 filter、`UnauthorizedException`
 * 又走另一个 filter，三者输出形状互不相同，前端得为每种状态写一套解析 —— 那是"维护难"的主要来源。
 *
 * ## `code` 与 HTTP 状态码的关系（**两个不同的东西**）
 *
 * | | 在哪 | 表达什么 |
 * | --- | --- | --- |
 * | **HTTP 状态码** | 响应**行**（`HTTP/1.1 200 OK`） | 这次请求在**协议层**的结局：到没到、方法对不对、资源在不在 |
 * | **`code`** | 响应**体** | 这次业务在**语义层**的结局 |
 *
 * 数值与 HTTP 对齐（200 / 404 / 500…）只是为了**好理解、好排查**；它们**互相独立**：
 * 业务细分时完全可以出现「HTTP 200 而 `code` 非 2xx」的情况（例如"批量导入部分成功"），
 * 那时传输层确实是成功的，细节由 `code` 表达。
 *
 * 所以前端判断成功请用 `isApiSuccess()`，**不要**只看 HTTP 状态、也不要写死 `=== 200` 之外的假设。
 *
 * ## 字段说明
 *
 * - `timestamp`：ISO 字符串，便于显示"刚刚更新"与排查时序；
 * - `traceId`：链路追踪标识（成功与失败都带），出问题时报它就能在后端日志里定位这一次请求；
 * - `errorCode`：**机器可读**的细粒度错误码（如 `AUTH.Token:expired`）。`code` 给的是**粗粒度类目**
 *   （鉴权失败 = 401），`errorCode` 给的是**具体原因**。前端按 `errorCode` 分支，**不要解析 `message`**。
 */

/**
 * 服务端返回码（业务码）。
 *
 * 数值沿用 HTTP 的常用码以便理解，但**它是本服务自己定义的**，不是 HTTP 状态码的副本：
 * 后端的 HTTP 状态码由框架按"协议层结局"设置，`code` 由业务按"语义层结局"决定。
 */
export const API_CODE = {
  /** 成功 */
  OK: 200,
  /** 创建成功 */
  CREATED: 201,
  /** 请求参数不合法（校验失败、字段缺失） */
  BAD_REQUEST: 400,
  /** 未认证：没登录 / 没带令牌 / 令牌无效或过期 */
  UNAUTHORIZED: 401,
  /** 已认证但**没有权限**做这件事 */
  FORBIDDEN: 403,
  /** 资源不存在 */
  NOT_FOUND: 404,
  /** 与现有资源冲突（如用户名已被占用） */
  CONFLICT: 409,
  /** 服务端错误（未预期异常） */
  INTERNAL_ERROR: 500,
} as const

export type ApiCode = (typeof API_CODE)[keyof typeof API_CODE]

/** 统一响应体：成功与失败**同一个形状**，靠 `code` 区分 */
export interface ApiResponse<T> {
  code: number
  data: T
  message: string
  timestamp: string
  /** 链路追踪：由后端中间件写入（成功响应也会带） */
  traceId?: string
  /** 失败时的细粒度原因（成功时不存在）。前端按它分支，不解析 `message` */
  errorCode?: string
}

/** 成功体（语义别名，便于调用方表达意图） */
export type ApiSuccessBody<T> = ApiResponse<T> & { code: number; data: T }
/** 失败体：同形状，`data` 为 `null` */
export type ApiErrorBody = ApiResponse<null> & { data: null; errorCode?: string; path?: string }

export function createApiResponse<T>(data: T, message = 'ok', extra?: { traceId?: string }): ApiSuccessBody<T> {
  return {
    code: API_CODE.OK,
    data,
    message,
    timestamp: new Date().toISOString(),
    ...(extra?.traceId ? { traceId: extra.traceId } : {}),
  }
}

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
