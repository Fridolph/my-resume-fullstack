/**
 * 请求上下文里挂的自定义字段。
 *
 * 用 declaration merging 给 Express 的 `Request` 补字段，好处是**全仓一处定义**：
 * 中间件写 `req.traceId`、守卫写 `req.user`、控制器读它们时都有类型，不必到处 `as any`。
 *
 * 放在 `common/` 而不是 `auth/`：`http-context` 是**跨域**的请求上下文（traceId 与 user
 * 分属不同域），放在这里能让依赖方向保持单向（`auth` → `common`），不产生循环引用。
 */

/**
 * JWT 只携带稳定的身份引用，权限和展示资料由数据库恢复。
 * 签名不隐藏载荷；iat/exp 由 JWT 库按配置生成。
 */
export interface JwtPayload {
  /** 用户主键 */
  sub: string
  /** 签发时的会话版本；服务端递增版本后，旧令牌立即失效 */
  sessionVersion: number
  /** 签发时间（秒） */
  iat?: number
  /** 过期时间（秒） */
  exp?: number
}

/** 通过鉴权后挂到 `req.user` 上的当前用户 */
export interface AuthUser {
  userId: string
  email: string | null
  nickname: string | null
  /** 当前数据库认可的会话版本；只用于签发与校验令牌，不返回给客户端 */
  sessionVersion: number
  /**
   * 从数据库恢复的当前角色键。
   */
  roleKeys: string[]
  permissionKeys: string[]
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /**
     * 扩展 Passport 的用户类型；Request.user 沿用 @types/passport 的声明。
     * 身份由 JwtStrategy 返回，Passport Guard 写入，避免重复声明 user 导致类型冲突。
     */
    interface User extends AuthUser {}

    interface Request {
      /** 由 `TraceIdMiddleware` 写入 */
      traceId?: string
    }
  }
}
