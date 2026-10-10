import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'
import { ExtractJwt } from 'passport-jwt'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { IS_PUBLIC_KEY } from './decorators/public.decorator'

/**
 * 基于 Passport JWT 策略的全局鉴权守卫。
 *
 * APP_GUARD 默认保护所有路由，只有 @Public() 显式放行。
 * token 提取、验签和过期检查委托 JwtStrategy；Passport 将策略返回的身份写入 request.user。
 * 本层仅处理公开路由和项目错误语义，业务权限仍由各业务 Guard 判断。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  /**
   * 方法级公开声明优先于控制器声明，其余请求交给 Passport 认证。
   * 登录入口不要求已有 token；受保护接口必须先完成认证才能进入业务 Guard。
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic === true) {
      return true
    }

    return super.canActivate(context)
  }

  /**
   * 将 Passport 认证失败转换为现有错误码，成功时返回策略恢复的身份。
   *
   * 策略抛出的用户状态或数据库异常原样向上传播，避免把服务故障误报为 401。
   * info 是 token 认证失败原因；这里保留缺失、过期、无效三种前端可识别的语义。
   */
  handleRequest<TUser = AuthUser>(
    error: unknown,
    user: TUser | false | null,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (error) {
      throw error
    }
    if (user) {
      return user
    }

    const request = context.switchToHttp().getRequest<Request>()
    if (!ExtractJwt.fromAuthHeaderAsBearerToken()(request)) {
      throw new UnauthorizedException('未携带访问令牌', { errorCode: API_ERROR_CODES.AUTH_TOKEN_MISSING })
    }

    const expired = info instanceof Error && info.name === 'TokenExpiredError'
    throw new UnauthorizedException(expired ? '登录状态已过期，请重新登录' : '访问令牌无效', {
      errorCode: expired ? API_ERROR_CODES.AUTH_TOKEN_EXPIRED : API_ERROR_CODES.AUTH_TOKEN_INVALID,
    })
  }
}
