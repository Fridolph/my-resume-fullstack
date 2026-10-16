import type { ApiErrorAction, ApiErrorPolicy } from './types.js'

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

/** 登录 / 访客 token 存 cookie 的 key（前端请求层与后端约定一致） */
export const TOKEN_COOKIE_KEY = 'my-resume.token'

/** 网络层失败（连响应都没拿到：断网 / 超时 / CORS）用 `0` 表示 */
export const NETWORK_ERROR_CODE = 0

/**
 * 错误处理策略表：**公共错误默认自动处理**（Owner 2026-10-09 定）。
 *
 * 这一套在 web / admin **完全一致**（两端都是前端），所以放在共享包里，不再各写一遍：
 * - **401** → 清 token + 提示 + 触发 `api:unauthorized`（宿主编决定去哪登录）；
 * - **403 / 404 / 5xx / 网络中断** → 统一提示（带 `traceId`）；
 * - **400（参数错误）/ 409（业务冲突）默认不提示** —— 这两类常常要落到表单字段或
 *   就地提示更合适，飘一个全局 toast 反而是重复信息，所以留给调用方。
 *
 * 按接口跳过：`$fetch(url, { silent: true })`（连 hook 都不触发）或 `{ errorPolicy: 'manual' }`。
 */
export const API_ERROR_POLICY: Record<number, ApiErrorPolicy> = {
  [NETWORK_ERROR_CODE]: { notify: true, action: 'none' },
  400: { notify: false, action: 'none' },
  401: { notify: true, action: 'redirect-login' },
  403: { notify: true, action: 'none' },
  404: { notify: true, action: 'none' },
  409: { notify: false, action: 'none' },
  500: { notify: true, action: 'none' },
}

/** 粗粒度文案（按 `code`） */
export const API_ERROR_MESSAGES: Record<number, string> = {
  [NETWORK_ERROR_CODE]: '网络异常，请检查网络连接',
  400: '请求参数有误',
  401: '登录已过期，请重新登录',
  403: '没有权限执行该操作',
  404: '请求的内容不存在',
  409: '操作与当前状态冲突，请刷新后重试',
  500: '服务暂时不可用，请稍后重试',
}

/** 细粒度文案（按 `errorCode`，**优先于 `code`**）；键名以后端契约为准 */
export const API_ERROR_CODE_MESSAGES: Record<string, string> = {
  'AUTH.Token:expired': '登录已过期，请重新登录',
  'AUTH.Token:invalid': '登录状态异常，请重新登录',
}

/** 策略表里没有的 code 走这里 */
export const FALLBACK_ERROR_POLICY: ApiErrorPolicy = { notify: false, action: 'none' }

/** 认不出文案时的兜底 */
export const UNKNOWN_ERROR_MESSAGE = '请求失败，请稍后重试'

/** 需要 `redirect-login` 的场景（供宿主决定怎么跳） */
export const REDIRECT_LOGIN_ACTION: ApiErrorAction = 'redirect-login'
