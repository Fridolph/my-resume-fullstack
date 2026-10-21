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
 * 出口有两个（都由 `apps/server` 统一写）：
 * - `HttpException` 的第二参 `errorCode`（Nest 12 的 `HttpExceptionOptions.errorCode`）；
 * - 兜底 filter 里按 `HttpStatus` 推断。
 */
export const API_ERROR_CODES = {
  RESUME_EDIT_FORBIDDEN: 'Resume.Draft:editForbidden',
  AUDIT_VIEW_FORBIDDEN: 'Audit.Log:viewForbidden',
  RESUME_NOT_FOUND: 'Resume.Draft:notFound',
  RESUME_DRAFT_CONFLICT: 'Resume.Draft:conflict',
  /** 没带 Authorization 头（或不是 Bearer 形式） */
  AUTH_TOKEN_MISSING: 'AUTH.Token:missing',
  /** 带了 token，但验签失败 / 格式不对 */
  AUTH_TOKEN_INVALID: 'AUTH.Token:invalid',
  /** token 过期 */
  AUTH_TOKEN_EXPIRED: 'AUTH.Token:expired',
  /**
   * 账号不存在、已删除或密码不匹配，避免向客户端透露账号存在性。
   */
  AUTH_CREDENTIALS_INVALID: 'AUTH.Credentials:invalid',
  /**
   * 当前用户不存在或已删除。
   */
  AUTH_USER_UNAVAILABLE: 'AUTH.User:unavailable',
  /** 令牌对应的会话版本已经被服务端撤销。 */
  AUTH_SESSION_REVOKED: 'AUTH.Session:revoked',
  /**
   * 创建用户所需的角色尚未初始化。
   */
  USER_ROLE_NOT_FOUND: 'Users.Role:notFound',
  /**
   * 操作者没有创建用户的身份或权限。
   */
  USER_CREATE_FORBIDDEN: 'Users.User:createForbidden',
  /**
   * 操作者无权修改目标用户的资料。
   */
  USER_UPDATE_FORBIDDEN: 'Users.User:updateForbidden',
  /**
   * 目标用户不存在或已软删除。
   */
  USER_NOT_FOUND: 'Users.User:notFound',
  /**
   * 操作者无权删除用户。
   */
  USER_DELETE_FORBIDDEN: 'Users.User:deleteForbidden',
  /**
   * 删除目标为超级管理员或不具备允许删除的角色。
   */
  USER_DELETE_PROTECTED: 'Users.User:deleteProtected',
  /** 操作者无权修改目标用户的密码。 */
  USER_PASSWORD_CHANGE_FORBIDDEN: 'Users.Password:changeForbidden',
  /** 旧密码校验失败。 */
  USER_PASSWORD_INVALID: 'Users.Password:invalid',
  /** 操作者无权强制下线用户。 */
  USER_FORCE_LOGOUT_FORBIDDEN: 'Users.Session:forceLogoutForbidden',
  /** 强制下线目标受到保护。 */
  USER_FORCE_LOGOUT_PROTECTED: 'Users.Session:forceLogoutProtected',
  /** 操作者无权变更目标用户的角色。 */
  USER_ROLE_CHANGE_FORBIDDEN: 'Users.Role:changeForbidden',
  /** 角色变更目标受到保护（自己或超级管理员）。 */
  USER_ROLE_CHANGE_PROTECTED: 'Users.Role:changeProtected',
  /** 上传被拒：类型不在白名单、超出大小、用途非法或没有文件。 */
  UPLOAD_INVALID: 'Upload.File:invalid',
  /** 通用唯一约束冲突。 */
  COMMON_UNIQUE_CONFLICT: 'Common.Conflict:unique',
  /** 通用关联数据冲突。 */
  COMMON_RELATION_CONFLICT: 'Common.Conflict:relation',
  /** 通用数据状态冲突。 */
  COMMON_STATE_CONFLICT: 'Common.Conflict:state',
  /** 服务端没配 JWT_SECRET —— 属于部署配置错误，应当在启动时就拦住 */
  AUTH_SECRET_MISSING: 'AUTH.Secret:missing',
  /**
   * 登录尝试过于频繁，被限流（429）。
   *
   * 与 `AUTH.Credentials:invalid` 的区别必须让前端分得清：后者是"这次输错了"，
   * 前者是"你已经试太多次，先停一会儿" —— 两者的用户动作完全不同。
   */
  AUTH_LOGIN_THROTTLED: 'AUTH.Login:throttled',
  /**
   * 想把**未发布**的简历设为默认展示（400）。
   *
   * 单独给码而不是复用 `Common.Validation:failed`：前端要据它给出可操作的引导
   * （「请先发布该简历」），而不是一句笼统的「参数有误」。
   */
  RESUME_NOT_PUBLISHED: 'Resume.Publish:required',
  /**
   * 分享链接相关。
   *
   * 分成五个码而**不复用一句"链接无效"**：失效原因不同，访客该做的事也不同 ——
   * 「已过期」该找作者要新链接，「已取消」可能作者主动收回，「简历未发布」是作者还没发。
   * 前提是：这些码**只说明链接状态，不含简历内容**，所以不构成信息泄露。
   */
  SHARE_NOT_FOUND: 'Share.Link:notFound',
  SHARE_EXPIRED: 'Share.Link:expired',
  SHARE_REVOKED: 'Share.Link:revoked',
  SHARE_UNPUBLISHED: 'Share.Link:unpublished',
  /** 该链接不允许下载 PDF（`allowPdf = false`） */
  SHARE_PDF_FORBIDDEN: 'Share.Link:pdfForbidden',
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
  // 429 目前只有登录限流一个来源。不给它兜底的话会落到 INTERNAL_ERROR，
  // 前端就把"试太快"显示成"服务器内部错误" —— 那是误导。
  // 将来若出现别的限流来源，应当为它单独定义错误码，而不是共用这个。
  if (status === 429) {
    return API_ERROR_CODES.AUTH_LOGIN_THROTTLED
  }
  return API_ERROR_CODES.INTERNAL_ERROR
}
