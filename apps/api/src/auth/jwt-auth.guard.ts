import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { API_ERROR_CODES } from '../common/error-codes'
import { AuthService } from './auth.service'
import { IS_PUBLIC_KEY } from './decorators/public.decorator'

/** 从 `Authorization: Bearer <token>` 取出 token；没有或格式不对返回 `null` */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization
  if (!header) {
    return null
  }

  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) {
    return null
  }

  return token.trim()
}

/**
 * 全局鉴权守卫（**自研，不依赖 Passport**）。
 *
 * ## 为什么不用 Passport
 *
 * 参考项目用的是 `@nestjs/passport` + `passport-jwt`，能跑，但：
 * - 要多装 3 个包（`@nestjs/passport` / `passport` / `passport-jwt`）且多一层抽象；
 * - `AuthGuard('jwt')` 内部做了什么（何时读 header、`handleRequest` 怎么兜异常）要翻源码才清楚，
 *   出问题时链路长一截。这里的全部逻辑就是下面 20 行，每一行都能一眼看完。
 *
 * ## 默认保护、显式开放
 *
 * 它在 `AppModule` 里注册为 **全局守卫**：**所有路由默认需要登录**，要开放就加 `@Public()`。
 * 反过来做（默认开放、逐个加守卫）漏掉一个就是权限漏洞 —— 这也是"安全默认值"的常见取舍。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 用 getAllAndOverride：方法上的 @Public() 覆盖类上的；两者都没有则为 undefined（＝要鉴权）
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic === true) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const token = extractBearerToken(request)
    if (!token) {
      throw new UnauthorizedException('未携带访问令牌', { errorCode: API_ERROR_CODES.AUTH_TOKEN_MISSING })
    }

    // 校验失败时 AuthService 会抛带 errorCode 的 401；成功则把用户挂到 request 上供控制器读取
    request.user = await this.authService.verify(token)
    return true
  }
}
