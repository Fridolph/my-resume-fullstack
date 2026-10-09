/**
 * 请求上下文里挂的自定义字段。
 *
 * 用 declaration merging 给 Express 的 `Request` 补字段，好处是**全仓一处定义**：
 * 中间件写 `req.traceId`、守卫写 `req.user`、控制器读它们时都有类型，不必到处 `as any`。
 *
 * 放在 `common/` 而不是 `auth/`：`http-context` 是**跨域**的请求上下文（traceId 与 user
 * 分属不同域），放在这里能让依赖方向保持单向（`auth` → `common`），不产生循环引用。
 */

/** JWT 里携带的载荷（自己签发，字段由 `AuthService.sign()` 决定） */
export interface JwtPayload {
  /** 用户主键 */
  sub: string
  /** 用户名（便于日志与前端显示） */
  username: string
  /** 权限键（`docs/dev/02_身份与权限_设计.md` §2.1 的规范）；后端做鉴权判断时用 */
  permissionKeys: string[]
  /** 签发时间（秒） */
  iat?: number
  /** 过期时间（秒） */
  exp?: number
}

/** 通过鉴权后挂到 `req.user` 上的当前用户 */
export interface AuthUser {
  userId: string
  username: string
  permissionKeys: string[]
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 由 `TraceIdMiddleware` 写入 */
      traceId?: string
      /** 由 `JwtAuthGuard` 验签通过后写入 */
      user?: AuthUser
    }
  }
}

export {}
