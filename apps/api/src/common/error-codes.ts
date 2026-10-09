/**
 * 机器可读的错误码。
 *
 * ## 为什么需要它
 *
 * 前端不该靠**解析中文文案**来判断"是 token 过期还是没带 token" —— 文案会改、会被翻译、
 * 会被复用。给它一个稳定的码，前端写 `if (errorCode === 'AUTH.Token:expired')`，
 * 文案怎么改都不影响逻辑。
 *
 * ## 命名
 *
 * 沿用权限键的 `<域>.<资源>:<动作>` 风格（见 `docs/dev/02_身份与权限_设计.md` §2.1），
 * 于是 `AUTH.Token:expired`、`Common.Validation:failed` 这种读起来是句子、搜起来能命中的形式。
 *
 * 出口有两个（都由 `apps/api` 统一写）：
 * - `HttpException` 的第二参 `errorCode`（Nest 12 的 `HttpExceptionOptions.errorCode`）；
 * - 兜底 filter 里按 `HttpStatus` 推断。
 */
export const API_ERROR_CODES = {
  /** 没带 Authorization 头（或不是 Bearer 形式） */
  AUTH_TOKEN_MISSING: 'AUTH.Token:missing',
  /** 带了 token，但验签失败 / 格式不对 */
  AUTH_TOKEN_INVALID: 'AUTH.Token:invalid',
  /** token 过期 */
  AUTH_TOKEN_EXPIRED: 'AUTH.Token:expired',
  /** 用户名或密码不对 */
  AUTH_CREDENTIALS_INVALID: 'AUTH.Credentials:invalid',
  /** 服务端没配 JWT_SECRET —— 属于部署配置错误，应当在启动时就拦住 */
  AUTH_SECRET_MISSING: 'AUTH.Secret:missing',
  /** 请求参数没过校验 */
  VALIDATION_FAILED: 'Common.Validation:failed',
  /** 路由不存在 */
  ROUTE_NOT_FOUND: 'Common.Route:notFound',
  /** 兜底：未预期的服务端错误 */
  INTERNAL_ERROR: 'Common.Internal:error',
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

/**
 * 按 HTTP 状态兜底推断错误码 —— 只用于**没有显式指定 errorCode** 的情况。
 * 比如 Nest 内置的 `HttpException`（`NotFoundException` 等）不会带码，这里给一个稳定的兜底值，
 * 保证前端永远能拿到 `errorCode`，不必写 `?? 'unknown'`。
 */
export function inferErrorCode(status: number): ApiErrorCode {
  if (status === 401) {
    return API_ERROR_CODES.AUTH_TOKEN_INVALID
  }
  if (status === 400) {
    return API_ERROR_CODES.VALIDATION_FAILED
  }
  if (status === 404) {
    return API_ERROR_CODES.ROUTE_NOT_FOUND
  }
  return API_ERROR_CODES.INTERNAL_ERROR
}
