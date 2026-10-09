import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser, JwtPayload } from '../common/http-context'

/**
 * 演示账号。
 *
 * 本轮还没有 `users` 模块（那是下一步），先用内存里的一对账号把**鉴权链路**跑通 ——
 * 这样 `auth/` 的公共部分可以独立于业务表结构先落地、先验证。
 *
 * ⚠️ 两处必须在接 `users` 模块时替换，且**对外契约不变**：
 * 1. 明文密码 → `按用户名查库 + bcrypt/argon2 比对`；
 * 2. 内存数组 → repository（`infrastructure/repositories/`）。
 *
 * 账号与前端 mock 对齐（`apps/web/app/mock/auth.ts` 的 `admin/admin`、`user/user`），
 * 权限键取自 `docs/dev/identity-and-access.md` §2.1 / §2.2。
 */
const DEMO_ACCOUNTS = [
  {
    userId: '1',
    username: 'admin',
    password: 'admin',
    permissionKeys: [
      'Resume.Profile:view',
      'Resume.Display:edit',
      'AiTalk.Chat:create',
      'Resume.Sections:edit',
      'Resume.Config:delete',
      'Resume.Snapshot:create',
      'Admin.Console:view',
    ],
  },
  {
    userId: '2',
    username: 'user',
    password: 'user',
    permissionKeys: ['Resume.Profile:view', 'Resume.Display:edit', 'AiTalk.Chat:create'],
  },
] as const

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  /** 账号密码 → 用户；不匹配返回 `null`，由调用方决定抛什么错（这里不抛，便于将来复用） */
  validateCredentials(username: string, password: string): AuthUser | null {
    const account = DEMO_ACCOUNTS.find(item => item.username === username && item.password === password)
    if (!account) {
      return null
    }

    return {
      userId: account.userId,
      username: account.username,
      permissionKeys: [...account.permissionKeys],
    }
  }

  /**
   * 签发访问令牌。
   *
   * 载荷只放**鉴权必需**的三样：`sub` / `username` / `permissionKeys`。
   * JWT 是**签名**不是加密 —— 谁拿到都能解开看内容，所以不放敏感信息。
   * 权限键放进去是为了让后续的业务接口不必每次回查库（代价是权限变更后要等 token 过期；
   * 真需要即时失效时再加 Redis 黑名单/版本号，属于后续话题）。
   */
  async sign(user: AuthUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.userId,
      username: user.username,
      permissionKeys: user.permissionKeys,
    }

    return this.jwt.signAsync(payload)
  }

  /**
   * 校验令牌 —— 不合法/过期都抛 401，但**带上不同的 errorCode**。
   *
   * 为什么要区分：前端对两者的处理不同 ——
   * `expired` 通常会先尝试刷新再重试，`invalid`（被篡改/乱填）则直接清会话登出。
   * 只给一个 401 的话，前端只能靠猜。
   */
  async verify(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token)

      return {
        userId: payload.sub,
        username: payload.username,
        permissionKeys: payload.permissionKeys ?? [],
      }
    } catch (error) {
      const expired = error instanceof Error && error.name === 'TokenExpiredError'

      throw new UnauthorizedException(expired ? '登录状态已过期，请重新登录' : '访问令牌无效', {
        errorCode: expired ? API_ERROR_CODES.AUTH_TOKEN_EXPIRED : API_ERROR_CODES.AUTH_TOKEN_INVALID,
      })
    }
  }
}
