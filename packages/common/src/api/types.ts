/**
 * 跨端共享的 API 契约类型（前端 `$request` / `httpRequest` 与后端 `apps/api` 共用）。
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

/**
 * 归一化后的请求错误 —— 业务错误 / HTTP 错误 / 网络中断统一成这一个形状。
 *
 * 请求层（`plugins/httpRequest.ts`）抛的就是它；调用方 catch 到的、colada 的 `error` 拿到的也是它。
 */
export interface NormalizedApiError {
  /** 业务码（`packages/common` 的 `code`）；网络失败为 `0` */
  code: number
  /** 细粒度错误码（如 `AUTH.Token:expired`）—— **按它分支，不解析 `message`** */
  errorCode?: string
  /** 后端原始 message（排查用，不直接展示给用户） */
  message: string
  /** 链路追踪：报给后端可在日志里定位这一次请求 */
  traceId?: string
  /** 后端给的请求路径（失败体里有） */
  path?: string
  /** 连响应都没拿到（断网 / 超时 / CORS） */
  isNetworkError: boolean
}

/** 错误发生后需要做的副作用 */
export type ApiErrorAction = 'none' | 'redirect-login'

/** 某个错误码对应的处理策略 */
export interface ApiErrorPolicy {
  /** 是否弹全局提示 */
  notify: boolean
  /** 需要执行的副作用（由提示层/调用方执行） */
  action: ApiErrorAction
}
