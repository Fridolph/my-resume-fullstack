import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { AuthService } from './auth.service'

/**
 * Passport 的 JWT 策略，使用与签发端相同的密钥和算法。
 *
 * passport-jwt 提取 Bearer token、验证签名和过期时间，通过后才调用 validate。
 * token 提供身份引用和会话版本，角色权限仍从数据库恢复；不启用服务器 session。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET').trim(),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    })
  }

  /**
   * 校验已验签载荷中的身份引用，并恢复数据库当前用户。
   *
   * 签名合法不代表载荷结构或账号状态可用；先检查 sub，再查询未删除用户。
   * 返回值由 Passport 写入 request.user，不信任 token 中的角色或权限快照。
   */
  validate(payload: unknown): Promise<AuthUser> {
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('sub' in payload) ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      !('sessionVersion' in payload) ||
      typeof payload.sessionVersion !== 'number' ||
      !Number.isSafeInteger(payload.sessionVersion) ||
      payload.sessionVersion < 0
    ) {
      throw new UnauthorizedException('访问令牌无效', { errorCode: API_ERROR_CODES.AUTH_TOKEN_INVALID })
    }

    return this.authService.restoreUser(payload.sub, payload.sessionVersion)
  }
}
