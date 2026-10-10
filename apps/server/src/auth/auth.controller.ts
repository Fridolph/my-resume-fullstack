import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import type { AuthUser } from '../common/http-context'
import { AuthService } from './auth.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { Public } from './decorators/public.decorator'
import { loginSchema, type LoginDto } from './dto/login.schema'

/**
 * 鉴权接口。
 *
 * 只放**鉴权本身的公共部分**（登录换 token、查当前会话）。
 * 改密码、用户资料属于 user 模块；auth 负责身份认证与会话。
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 登录换 token。`@Public()` —— 登录本身当然不该要求先有 token。
   *
   * `@HttpCode(200)`：POST 默认返回 **201 Created**，但登录并不"创建资源"，
   * 语义上应为 200（前端按 2xx 判断没问题，但 201 会让人误以为新建了实体）。
   *
   * `@Body({ schema })` 是 Nest 12 的 Standard Schema 用法：schema 挂在参数元数据上，
   * 由全局的 `StandardSchemaValidationPipe` 读取并校验（见 `main.ts` 的全局管道）。
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body({ schema: loginSchema }) loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }

  /**
   * 返回经全局 JWT Guard 恢复的当前会话，不重复查询数据库。
   *
   * 客户端携带 Bearer token，Guard 通过 sub 验证用户并读取最新角色权限。
   * 昵称、邮箱属于可变资料，取 request.user 当前值，不依赖 JWT 中的历史快照。
   */
  @Get('info')
  getInfo(@CurrentUser() user: AuthUser) {
    const { roleKeys, permissionKeys, ...identity } = user

    return {
      ...identity,
      roleKeys,
      permissionKeys,
    }
  }
}
