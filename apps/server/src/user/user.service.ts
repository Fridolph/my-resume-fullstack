import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PERMISSION_KEYS } from '../auth/permission-keys'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { hashPassword, verifyPassword } from '../common/password'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '../generated/prisma/client'
import type { ChangePasswordDto, CreateUserDto, UpdateUserDto, UsersDto } from './dto/user.schema'

/**
 * 用户管理业务层。
 */
@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 查询用户列表并组装分页元数据。
   *
   * 当前保留模板；后续查询需排除软删除记录，并 select 安全字段。
   */
  async findAll(usersDto: UsersDto) {
    void usersDto
    throw new Error('TODO: implement UserService.findAll')
  }

  /**
   * 查询单个用户，不返回密码哈希。
   *
   * 当前保留模板；不存在与已删除的用户应采用相同的资源不存在语义。
   */
  async findOne(id: string) {
    void id
    throw new Error('TODO: implement UserService.findOne')
  }

  /**
   * 超管开通登录账号，保存密码哈希并分配已初始化的角色。
   *
   * Guard 已验证操作者，schema 已规范化 username/email；角色预查询用于明确的业务提示，
   * 并不替代数据库外键。nested write 保证用户与角色关联一起成功或回滚。
   * 不预查邮箱重复：唯一约束负责并发安全，冲突由全局 Filter 转为 409。
   * select 从查询源头排除 passwordHash，昵称默认值不影响用户的 cuid 身份。
   */
  async create(createUserDto: CreateUserDto) {
    const role = await this.prismaService.role.findUnique({
      where: { key: createUserDto.roleKey },
      select: { id: true },
    })

    if (!role) {
      throw new BadRequestException('指定角色尚未初始化', {
        errorCode: API_ERROR_CODES.USER_ROLE_NOT_FOUND,
      })
    }

    const passwordHash = await hashPassword(createUserDto.password)

    const user = await this.prismaService.user.create({
      data: {
        username: createUserDto.username ?? null,
        nickname: createUserDto.nickname ?? null,
        passwordHash,
        email: createUserDto.email ?? null,
        avatar: createUserDto.avatar ?? null,
        roles: {
          create: {
            role: { connect: { id: role.id } },
          },
        },
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        avatar: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    return {
      ...user,
      roles: user.roles.map(assignment => assignment.role),
    }
  }

  /**
   * 局部修改用户信息。
   *
   * 普通用户和管理员只能修改自己；超级管理员可修改其他未删除用户。
   * 字段白名单由 schema 提供，username、email、roleKey 与 password 不属于本用例。
   * 未传字段保持原值，显式 null 用于清空 nickname 或 avatar；密码修改另行设计。
   * 先授权再查目标，避免未授权调用通过 403/404 差异探测用户是否存在。
   * 更新条件再次排除软删除记录；并发删除使更新不再匹配时，由全局 Filter 返回 409。
   * select 仅取安全字段，单条更新无需手动事务，也无需重新签发 JWT。
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: AuthUser) {
    const isSelf = id === currentUser.userId
    const canManageOtherUsers =
      currentUser.roleKeys.includes('super_admin') &&
      currentUser.permissionKeys.includes(PERMISSION_KEYS.SETTINGS_USERS_EDIT)

    if (!isSelf && !canManageOtherUsers) {
      throw new ForbiddenException('用户只能修改自己的用户信息', {
        errorCode: API_ERROR_CODES.USER_UPDATE_FORBIDDEN,
      })
    }

    const targetUser = await this.prismaService.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })

    if (!targetUser) {
      throw new NotFoundException('用户不存在或已删除', {
        errorCode: API_ERROR_CODES.USER_NOT_FOUND,
      })
    }

    const data: Prisma.UserUpdateInput = {}
    if (updateUserDto.nickname !== undefined) data.nickname = updateUserDto.nickname
    if (updateUserDto.avatar !== undefined) data.avatar = updateUserDto.avatar

    return this.prismaService.user.update({
      where: { id, deletedAt: null },
      data,
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  /**
   * 软删除用户。
   *
   * 只有具备 super_admin 角色和用户删除权限的操作者才能删除。
   * 禁止删除自己及任何包含 super_admin 角色的用户，避免误锁定系统管理入口。
   * 只写入 deletedAt，不删除 UserRole，也不释放 username/email 的唯一值；
   * JwtStrategy 下一次恢复身份时会拒绝已软删除用户。
   * 预查询用于区分不存在、受保护和已删除目标；updateMany 再次带上状态与角色条件，
   * 通过影响行数处理预查询之后的并发状态变化，不在方法内捕获 Prisma 错误。
   */
  async remove(id: string, currentUser: AuthUser) {
    const canDeleteUsers =
      currentUser.roleKeys.includes('super_admin') &&
      currentUser.permissionKeys.includes(PERMISSION_KEYS.SETTINGS_USERS_DELETE)

    if (!canDeleteUsers) {
      throw new ForbiddenException('仅超级管理员可删除用户', {
        errorCode: API_ERROR_CODES.USER_DELETE_FORBIDDEN,
      })
    }

    if (id === currentUser.userId) {
      throw new ForbiddenException('不能删除自己', {
        errorCode: API_ERROR_CODES.USER_DELETE_FORBIDDEN,
      })
    }

    const targetUser = await this.prismaService.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        roles: {
          select: { role: { select: { key: true } } },
        },
      },
    })

    if (!targetUser) {
      throw new NotFoundException('用户不存在或已删除', {
        errorCode: API_ERROR_CODES.USER_NOT_FOUND,
      })
    }

    const roleKeys = targetUser.roles.map(assignment => assignment.role.key)
    if (roleKeys.includes('super_admin')) {
      throw new ForbiddenException('不能删除超级管理员', {
        errorCode: API_ERROR_CODES.USER_DELETE_PROTECTED,
      })
    }

    if (!roleKeys.some(roleKey => roleKey === 'user' || roleKey === 'admin')) {
      throw new ForbiddenException('仅允许删除普通用户或管理员', {
        errorCode: API_ERROR_CODES.USER_DELETE_PROTECTED,
      })
    }

    const deletedAt = new Date()
    const result = await this.prismaService.user.updateMany({
      where: {
        id,
        deletedAt: null,
        roles: {
          none: { role: { key: 'super_admin' } },
          some: { role: { key: { in: ['user', 'admin'] } } },
        },
      },
      data: { deletedAt },
    })

    if (result.count === 0) {
      throw new ConflictException('用户状态已变化，请刷新后重试', {
        errorCode: API_ERROR_CODES.COMMON_STATE_CONFLICT,
      })
    }

    return { id, deletedAt }
  }

  /**
   * 修改当前身份的密码，并同时递增会话版本。
   *
   * 路径 ID 只允许指向 currentUser.userId；旧密码验证的是当前哈希，
   * 新哈希与版本递增通过同一条条件更新写入。条件包含旧哈希和旧版本，
   * 因此并发改密或强制下线时只有一个请求能基于同一旧状态成功。
   */
  async changePassword(id: string, changePasswordDto: ChangePasswordDto, currentUser: AuthUser) {
    if (id !== currentUser.userId) {
      throw new ForbiddenException('只能修改自己的密码', {
        errorCode: API_ERROR_CODES.USER_PASSWORD_CHANGE_FORBIDDEN,
      })
    }

    const user = await this.prismaService.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, passwordHash: true, sessionVersion: true },
    })

    if (!user) {
      throw new NotFoundException('用户不存在或已删除', {
        errorCode: API_ERROR_CODES.USER_NOT_FOUND,
      })
    }

    if (!(await verifyPassword(changePasswordDto.oldPassword, user.passwordHash))) {
      throw new BadRequestException('旧密码不正确', {
        errorCode: API_ERROR_CODES.USER_PASSWORD_INVALID,
      })
    }

    if (await verifyPassword(changePasswordDto.newPassword, user.passwordHash)) {
      throw new BadRequestException('新密码不能与旧密码相同', {
        errorCode: API_ERROR_CODES.USER_PASSWORD_INVALID,
      })
    }

    const passwordHash = await hashPassword(changePasswordDto.newPassword)
    const result = await this.prismaService.user.updateMany({
      where: {
        id,
        deletedAt: null,
        passwordHash: user.passwordHash,
        sessionVersion: user.sessionVersion,
      },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    })

    if (result.count === 0) {
      throw new ConflictException('账号状态已变化，请刷新后重试', {
        errorCode: API_ERROR_CODES.COMMON_STATE_CONFLICT,
      })
    }

    return { id }
  }

  /**
   * 撤销 user/admin 的现有会话，不读取或修改目标密码。
   *
   * 只有 super_admin 且具备用户编辑权限可以执行；目标不能是自己、超管或已删除用户。
   * 数据库使用原子 increment，旧 JWT 在下一次身份恢复时因版本不匹配而返回 401。
   */
  async forceLogout(id: string, currentUser: AuthUser) {
    const canForceLogout =
      currentUser.roleKeys.includes('super_admin') &&
      currentUser.permissionKeys.includes(PERMISSION_KEYS.SETTINGS_USERS_EDIT)

    if (!canForceLogout || id === currentUser.userId) {
      throw new ForbiddenException('仅超级管理员可强制下线其他用户', {
        errorCode: API_ERROR_CODES.USER_FORCE_LOGOUT_FORBIDDEN,
      })
    }

    const targetUser = await this.prismaService.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    })

    if (!targetUser) {
      throw new NotFoundException('用户不存在或已删除', {
        errorCode: API_ERROR_CODES.USER_NOT_FOUND,
      })
    }

    const roleKeys = targetUser.roles.map(assignment => assignment.role.key)
    if (roleKeys.includes('super_admin') || !roleKeys.some(roleKey => roleKey === 'user' || roleKey === 'admin')) {
      throw new ForbiddenException('不能强制下线该用户', {
        errorCode: API_ERROR_CODES.USER_FORCE_LOGOUT_PROTECTED,
      })
    }

    const result = await this.prismaService.user.updateMany({
      where: {
        id,
        deletedAt: null,
        roles: {
          none: { role: { key: 'super_admin' } },
          some: { role: { key: { in: ['user', 'admin'] } } },
        },
      },
      data: { sessionVersion: { increment: 1 } },
    })

    if (result.count === 0) {
      throw new ConflictException('用户状态已变化，请刷新后重试', {
        errorCode: API_ERROR_CODES.COMMON_STATE_CONFLICT,
      })
    }

    return { id }
  }
}
