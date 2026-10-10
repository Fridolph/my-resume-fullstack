import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Prisma } from '../generated/prisma/client'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser, JwtPayload } from '../common/http-context'
import { verifyPassword } from '../common/password'
import { PrismaService } from '../prisma/prisma.service'
import type { LoginDto } from './dto/login.schema'

const identitySelect = {
  id: true,
  email: true,
  nickname: true,
  sessionVersion: true,
  roles: {
    select: {
      role: {
        select: {
          key: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  },
} satisfies Prisma.UserSelect

type UserIdentityRecord = Prisma.UserGetPayload<{ select: typeof identitySelect }>

/**
 * 数据库身份认证、JWT 签发与当前会话恢复。
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * 用用户名或邮箱查找用户、校验密码并签发访问令牌。
   *
   * 不存在、已删除与密码错误统一返回 401，不向调用方透露账号存在性。
   * verifyPassword 复用已存哈希的盐和参数，不能用生成新盐的 hashPassword 直接比较。
   * 数据库错误继续交给全局 Filter，避免把服务故障误报成凭据错误。
   * account 含 `@` 时按 email 查询，否则按 username 查询；仅从查询结果组装安全身份，
   * passwordHash 不进入响应或 JWT。
   */
  async login(loginDto: LoginDto) {
    const account = loginDto.account.trim()
    const accountWhere = account.includes('@')
      ? { email: account.toLowerCase() }
      : { username: account.toLowerCase() }
    const user = await this.prismaService.user.findFirst({
      where: { ...accountWhere, deletedAt: null },
      select: { ...identitySelect, passwordHash: true },
    })
    if (!user || !(await verifyPassword(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException('账号或密码不正确', {
        errorCode: API_ERROR_CODES.AUTH_CREDENTIALS_INVALID,
      })
    }

    const authUser = toAuthUser(user)
    const { roleKeys, permissionKeys, sessionVersion, ...identity } = authUser

    return {
      token: await this.sign(authUser),
      ...identity,
      roleKeys,
      permissionKeys,
    }
  }

  /**
   * 签发有期限的访问令牌，以稳定的 cuid 主键作为 sub。
   *
   * JWT 是签名而非加密，拿到令牌的人可以读取载荷，所以不放密码、邮箱或昵称。
   * 角色与权限不写入 JWT：每次请求验签后按 sub 回查数据库，角色变化与软删除
   * 在下一次请求生效。sessionVersion 只用于撤销该用户的旧会话，不承载业务权限。
   * 代价是每次受保护请求都需要一次身份查询；刷新令牌与跨设备会话管理属于后续设计。
   */
  async sign(user: AuthUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.userId,
      sessionVersion: user.sessionVersion,
    }

    return this.jwtService.signAsync(payload)
  }

  /**
   * 按已认证的用户主键恢复数据库中的当前身份。
   *
   * JwtStrategy 完成 token 验签与载荷检查，本方法只负责查询身份，不重复验签。
   * 身份查询故障仍交给全局 Filter，不能捕获后伪装成登录失效。
   * 不信任 JWT 中可能携带的昵称、邮箱或权限快照，始终取数据库当前值；昵称为空时由展示层回退。
   * 同时比较 token 的 sessionVersion 与数据库版本；版本不一致表示会话已被改密或超管强制下线。
   * 已删除用户即使持有尚未过期的 token，也不能继续访问受保护接口。
   */
  async restoreUser(userId: string, tokenSessionVersion: number): Promise<AuthUser> {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: identitySelect,
    })
    if (!user) {
      throw new UnauthorizedException('用户不存在或已删除', { errorCode: API_ERROR_CODES.AUTH_USER_UNAVAILABLE })
    }

    if (user.sessionVersion !== tokenSessionVersion) {
      throw new UnauthorizedException('登录状态已失效，请重新登录', {
        errorCode: API_ERROR_CODES.AUTH_SESSION_REVOKED,
      })
    }

    return toAuthUser(user)
  }
}

/**
 * 将数据库关系结构转换为请求身份，多角色权限取并集并排序。
 *
 * 显式挑选字段，避免登录查询中的 passwordHash 通过对象展开进入响应。
 */
function toAuthUser(user: UserIdentityRecord): AuthUser {
  const permissionKeys = user.roles.flatMap(assignment => assignment.role.permissions.map(item => item.permission.key))

  return {
    userId: user.id,
    email: user.email,
    nickname: user.nickname,
    sessionVersion: user.sessionVersion,
    roleKeys: user.roles.map(assignment => assignment.role.key).sort(),
    permissionKeys: [...new Set(permissionKeys)].sort(),
  }
}
