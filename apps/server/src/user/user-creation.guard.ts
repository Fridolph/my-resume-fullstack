import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { PERMISSION_KEYS } from '../auth/permission-keys'
import { API_ERROR_CODES } from '../common/error-codes'

/**
 * 用户创建权限；在全局 JWT 守卫完成身份恢复后执行。
 */
@Injectable()
export class UserCreationGuard implements CanActivate {
  /**
   * 同时验证超管身份和创建权限，前端隐藏按钮不能替代后端授权。
   *
   * 全局 JWT Guard 已恢复数据库当前身份；普通 admin 即使能登录后台也不能创号。
   * 被创建用户的 roleKey 与操作者身份是两个不同概念，不能从请求体推断授权。
   */
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request>().user
    if (!user) {
      throw new UnauthorizedException('未登录', { errorCode: API_ERROR_CODES.AUTH_TOKEN_MISSING })
    }

    if (
      !user.roleKeys.includes('super_admin') ||
      !user.permissionKeys.includes(PERMISSION_KEYS.SETTINGS_USERS_CREATE)
    ) {
      throw new ForbiddenException('仅超级管理员可创建用户', { errorCode: API_ERROR_CODES.USER_CREATE_FORBIDDEN })
    }

    return true
  }
}
