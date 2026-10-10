import { BadRequestException, Injectable } from '@nestjs/common'
import { API_ERROR_CODES } from '../common/error-codes'
import { hashPassword } from '../common/password'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateUserDto, UpdateUserDto, UsersDto } from './dto/user.schema'

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
   * 当前保留模板；后续 nickname 的修改不改变主键，密码修改另行设计。
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    void id
    void updateUserDto
    throw new Error('TODO: implement UserService.update')
  }

  /**
   * 软删除用户。
   *
   * 当前保留模板；删除后身份恢复会拒绝该用户，username/email 唯一值仍保留占用。
   */
  async remove(id: string) {
    void id
    throw new Error('TODO: implement UserService.remove')
  }
}
