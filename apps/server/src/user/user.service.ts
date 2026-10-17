import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PERMISSION_KEYS } from '../auth/permission-keys'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { hashPassword, verifyPassword } from '../common/password'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuditContext } from '../audit/audit.types'
import type { Prisma } from '../generated/prisma/client'
import type { ChangePasswordDto, ChangeUserRolesDto, CreateUserDto, UpdateUserDto, UsersDto } from './dto/user.schema'

/**
 * 用户管理业务层。
 *
 * ## 三个写动作都带审计，且都写在**业务事务内**（强一致）
 *
 * `create` / `remove` / `changeRoles` 都属"宁可失败也不能做了没记录"的一类：
 * 它们改变的是**谁能进入系统、谁拥有什么权限**。若审计掉在事务外，
 * 就会出现"权限已经改了、但没人知道是谁改的"——而这正是追责时唯一有用的信息。
 *
 * 代价只是同一个事务里多一条 INSERT；这三个动作本身低频，不值得为省这点开销
 * 把一致性丢掉（对照：`changePassword` / `forceLogout` 属会话域，本轮不做审计）。
 */
@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
   * 超管开通登录账号，保存密码哈希并分配已初始化的角色，**并在同一事务内写审计**。
   *
   * Guard 已验证操作者，schema 已规范化 username/email；角色预查询用于明确的业务提示，
   * 并不替代数据库外键。nested write 保证用户与角色关联一起成功或回滚。
   * 不预查邮箱重复：唯一约束负责并发安全，冲突由全局 Filter 转为 409。
   * select 从查询源头排除 passwordHash，昵称默认值不影响用户的 cuid 身份。
   *
   * 审计写进**这个事务**（而不是创建成功后再补一条）：账号创建是**准入动作**，
   * 不允许出现"账号建好了但没记录"。哈希在事务之外算好（bcrypt 是 CPU 密集的，
   * 放进事务会白白占着连接）。
   *
   * @param currentUser 操作者，来自 `req.user`（审计的 actor）
   * @param context 请求级上下文，目前只有 `requestId`
   */
  async create(createUserDto: CreateUserDto, currentUser: AuthUser, context: AuditContext = {}) {
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

    return this.prismaService.$transaction(async transaction => {
      const user = await transaction.user.create({
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

      const roleKeys = user.roles.map(assignment => assignment.role.key)

      await this.auditService.recordUserCreation(transaction, currentUser, {
        userId: user.id,
        nickname: user.nickname,
        // 记"落库后实际拥有的角色"，而不是请求里的 roleKey —— 审计以事实为准
        roleKeys,
        requestId: context.requestId,
      })

      return {
        ...user,
        roles: user.roles.map(assignment => assignment.role),
      }
    })
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
   * 软删除用户，**并在同一事务内写审计**。
   *
   * 只有具备 super_admin 角色和用户删除权限的操作者才能删除。
   * 禁止删除自己及任何包含 super_admin 角色的用户，避免误锁定系统管理入口。
   * 只写入 deletedAt，不删除 UserRole，也不释放 username/email 的唯一值；
   * JwtStrategy 下一次恢复身份时会拒绝已软删除用户。
   * 预查询用于区分不存在、受保护和已删除目标；updateMany 再次带上状态与角色条件，
   * 通过影响行数处理预查询之后的并发状态变化，不在方法内捕获 Prisma 错误。
   *
   * **为什么把预查询也收进事务**：审计快照（昵称、删除前的角色集合）必须与
   * 实际被删的那一行**在同一个一致性视图里**读取。留在事务外读，理论上会出现
   * "读到 A 状态、删掉 B 状态"，而快照是不可补的 —— 记错了就永久错。
   * 事务因此比原来稍长，但它只包住几条按主键命中的语句。
   */
  async remove(id: string, currentUser: AuthUser, context: AuditContext = {}) {
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

    return this.prismaService.$transaction(async transaction => {
      const targetUser = await transaction.user.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          nickname: true,
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
      const result = await transaction.user.updateMany({
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

      await this.auditService.recordUserDeletion(transaction, currentUser, {
        userId: id,
        nickname: targetUser.nickname,
        // 删除**之前**的角色集合 —— 删完再读就是另一回事了（虽然软删保留了关联，
        // 但"当时是什么角色"必须以删除时刻为准）
        roleKeys,
        requestId: context.requestId,
      })

      return { id, deletedAt }
    })
  }

  /**
   * 调整某个用户的角色集合（**传完整集合**，不是增量）。
   *
   * ## 授权与保护
   *
   * 要求超管角色 + `Settings.Users:edit`（与 `update` 同口径，不新开权限键：
   * "能编辑用户"本来就包含"能改他的角色"，另开一个键只会让两个键的定义开始漂移）。
   * 目标不能是自己、不能是超管 —— 前者防自锁/自我提权，后者防把系统管理入口改坏。
   *
   * ## 事务与审计
   *
   * `user_roles` 的删与建必须在同一事务里：中间态是"这个人没有任何角色"，
   * 万一被打断或被读到，等于短暂把人锁在系统外。审计写在**同一事务**里，
   * 于是"权限变了但没记录"在结构上不可能发生。
   *
   * ## 没有变化时**不写审计**
   *
   * 审计记的是**变更**。若前后集合相同，这次请求什么也没改变 ——
   * 记一条 `before === after` 的行只会稀释审计，让"真的改过"更难被看到。
   * 也正因为如此，本方法是幂等的：重复调用只产生第一条审计。
   *
   * ## 为什么不递增 sessionVersion
   *
   * `JwtStrategy` 每次请求都按 `sub` 回查数据库重建 `roleKeys` / `permissionKeys`
   *（见 auth 模块注释），所以权限变更**下一次请求即生效**，不需要靠强制下线来兜底。
   *
   * @returns 变更后的角色键集合（排序去重）
   */
  async changeRoles(
    id: string,
    changeUserRolesDto: ChangeUserRolesDto,
    currentUser: AuthUser,
    context: AuditContext = {},
  ) {
    const canChangeRoles =
      currentUser.roleKeys.includes('super_admin') &&
      currentUser.permissionKeys.includes(PERMISSION_KEYS.SETTINGS_USERS_EDIT)

    if (!canChangeRoles) {
      throw new ForbiddenException('仅超级管理员可变更用户角色', {
        errorCode: API_ERROR_CODES.USER_ROLE_CHANGE_FORBIDDEN,
      })
    }

    if (id === currentUser.userId) {
      throw new ForbiddenException('不能修改自己的角色', {
        errorCode: API_ERROR_CODES.USER_ROLE_CHANGE_PROTECTED,
      })
    }

    // 排序去重后再比：客户端传 ['user','admin'] 与 ['admin','user'] 是同一个集合，
    // 排序让"有没有变化"和审计里的 before/after 都可比对。
    const after = [...new Set(changeUserRolesDto.roleKeys)].sort()

    return this.prismaService.$transaction(async transaction => {
      // ⚠️ **先锁目标用户行**，再读角色 —— 这一步不是防御性代码，是正确性要求。
      //
      // "改角色"在数据上是 `user_roles` 的**删 + 建两条语句**。PostgreSQL 默认隔离级别是
      // READ COMMITTED：T1 删掉旧关联后，T2 的 DELETE 会等 T1 提交、再发现"没有行可删"而跳过，
      // 但 T2 的 INSERT 仍会执行 —— 于是两个人的意图被**并集**成一个结果
      // （要 'user' 与要 'admin' 的两个并发请求，最后得到 user + admin）。
      // 权限只会变多、不会变少，正是最不该出错的方向。
      //
      // `SELECT … FOR UPDATE` 把同一用户的并发改角色真正串行：后到者等锁，
      // 拿到锁后读到的是前一个事务的**结果**，两个意图各自完整生效。
      // 这也是 `docs/server/07_账号权限与会话_设计.md` §5 里留的那句
      // "以后增加在线改角色时，需要与角色修改共同设计事务/锁"的落地。
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`

      const targetUser = await transaction.user.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          nickname: true,
          roles: { select: { role: { select: { id: true, key: true } } } },
        },
      })

      if (!targetUser) {
        throw new NotFoundException('用户不存在或已删除', {
          errorCode: API_ERROR_CODES.USER_NOT_FOUND,
        })
      }

      const before = [...new Set(targetUser.roles.map(assignment => assignment.role.key))].sort()

      if (before.includes('super_admin')) {
        throw new ForbiddenException('不能修改超级管理员的角色', {
          errorCode: API_ERROR_CODES.USER_ROLE_CHANGE_PROTECTED,
        })
      }

      if (before.length === after.length && before.every((key, index) => key === after[index])) {
        return { id, roleKeys: before }
      }

      // 按 key 反查角色 id：schema 只放行 admin/user，但角色是否已 seed 仍要确认，
      // 否则 createMany 会撞外键，错误会以 500 的形式漏到客户端。
      const roles = await transaction.role.findMany({
        where: { key: { in: after } },
        select: { id: true, key: true },
      })

      if (roles.length !== after.length) {
        throw new BadRequestException('指定角色尚未初始化', {
          errorCode: API_ERROR_CODES.USER_ROLE_NOT_FOUND,
        })
      }

      await transaction.userRole.deleteMany({ where: { userId: id } })
      await transaction.userRole.createMany({
        // 按 key 排序后写入：`after` 与 `roles` 的长度已校验相等，且 `role.key` 唯一，
        // 所以排序后的两项一一对应 —— 不必再做一次可能拿到 undefined 的 Map 取值。
        data: [...roles]
          .sort((left, right) => (left.key < right.key ? -1 : 1))
          .map(role => ({ userId: id, roleId: role.id })),
      })

      await this.auditService.recordRoleChange(transaction, currentUser, {
        userId: id,
        nickname: targetUser.nickname,
        before,
        after,
        requestId: context.requestId,
      })

      return { id, roleKeys: after }
    })
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
