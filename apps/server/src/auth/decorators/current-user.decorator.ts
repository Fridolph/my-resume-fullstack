import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthUser } from '../../common/http-context'

/**
 * 取当前登录用户：
 *
 * ```ts
 * @Get('me')
 * me(@CurrentUser() user: AuthUser) { … }
 *
 * @Get('name')
 * name(@CurrentUser('nickname') nickname: string) { … }   // 只要一个字段
 * ```
 *
 * 值由 `JwtAuthGuard` 验签通过后写入 `req.user`。两点要注意：
 * - 它**只在本守卫生效的路由上可用**（`@Public()` 的路由没有 `req.user`，此时返回 `undefined`）；
 * - 返回值类型写的是 `AuthUser`，但公开路由上实际可能是 `undefined` —— 这是刻意的：
 *   要让调用方在"受保护路由"里直接拿到非空类型，而不必到处写 `!`。
 */
export const CurrentUser = createParamDecorator((field: keyof AuthUser | undefined, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>()
  const user = request.user
  if (!user) {
    return undefined
  }

  return field ? user[field] : user
})
