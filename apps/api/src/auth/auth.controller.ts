import { Body, Controller, Get, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { AuthService } from './auth.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { Public } from './decorators/public.decorator'
import { loginSchema, type LoginInput } from './dto/login.schema'

/**
 * 鉴权接口。
 *
 * 只放**鉴权本身的公共部分**（登录换 token、查当前会话）。
 * 改密码、用户资料这类属于将来的 `users` 模块 —— `auth` 保持"只回答我是谁、我能做什么"。
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * 登录换 token。`@Public()` —— 登录本身当然不该要求先有 token。
   *
   * `@HttpCode(200)`：POST 默认返回 **201 Created**，但登录并不"创建资源"，
   * 语义上应为 200（前端按 2xx 判断没问题，但 201 会让人误以为新建了实体）。
   *
   * `@Body({ schema })` 是 Nest 12 的 Standard Schema 用法：schema 挂在参数元数据上，
   * 由全局的 `StandardSchemaValidationPipe` 读取并校验（见 `common/zod-validation.ts`）。
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body({ schema: loginSchema }) dto: LoginInput) {
    const user = this.auth.validateCredentials(dto.username, dto.password)
    if (!user) {
      // 只回"用户名或密码不正确"，不区分是哪个错 —— 免得给撞库的人提供"这个用户名存在"的信息
      throw new UnauthorizedException('用户名或密码不正确', {
        errorCode: API_ERROR_CODES.AUTH_CREDENTIALS_INVALID,
      })
    }

    return {
      token: await this.auth.sign(user),
      user: { userId: user.userId, username: user.username },
      permissionKeys: user.permissionKeys,
    }
  }

  /**
   * 当前会话 —— 受保护路由的最小示例，同时是前端需要的"会话接口"：
   * 拿 cookie 里的 token 调它，一次拿到用户与权限键
   * （对应 `docs/dev/identity-and-access.md` §2.4 里说的"P2 换成拿 token 请求 session 接口"）。
   */
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return {
      user: { userId: user.userId, username: user.username },
      permissionKeys: user.permissionKeys,
    }
  }
}
