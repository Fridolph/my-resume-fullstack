import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import {
  createUserSchema,
  changePasswordSchema,
  listUserSchema,
  updateUserSchema,
  userIdSchema,
  type CreateUserDto,
  type ChangePasswordDto,
  type UpdateUserDto,
  type UsersDto,
} from './dto/user.schema'
import { UserService } from './user.service'
import { UserCreationGuard } from './user-creation.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../common/http-context'

/**
 * 用户管理 HTTP 入口。
 */
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 查询用户列表。
   */
  @Get()
  findAll(@Query({ schema: listUserSchema }) usersDto: UsersDto) {
    return this.userService.findAll(usersDto)
  }

  /**
   * 查询单个用户。
   */
  @Get(':id')
  findOne(@Param('id', { schema: userIdSchema }) id: string) {
    return this.userService.findOne(id)
  }

  /**
   * 创建用户。
   *
   * 全局 JWT Guard 认证、UserCreationGuard 授权，再由 schema 校验创号输入。
   * Controller 只负责 HTTP 接入，角色查询、哈希与原子写入由 Service 完成。
   * POST 保留 201，返回数据由全局响应 Interceptor 包装，不拼另一套响应。
   */
  @Post()
  @UseGuards(UserCreationGuard)
  create(@Body({ schema: createUserSchema }) createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto)
  }

  /**
   * 修改用户展示资料。
   *
   * Schema 限定昵称与头像，CurrentUser 读取 JWT 守卫恢复的数据库身份。
   * Controller 不信任请求体中的操作者信息；目标归属与管理权限交给 Service 判断。
   */
  @Patch(':id')
  update(
    @Param('id', { schema: userIdSchema }) id: string,
    @Body({ schema: updateUserSchema }) updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.userService.update(id, updateUserDto, currentUser)
  }

  /**
   * 修改当前登录用户的密码。
   *
   * Service 会把路径 ID 与认证身份比较，再用旧密码校验控制权；
   * 成功后递增会话版本，使该用户已有的访问令牌全部失效。
   */
  @Patch(':id/password')
  changePassword(
    @Param('id', { schema: userIdSchema }) id: string,
    @Body({ schema: changePasswordSchema }) changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.userService.changePassword(id, changePasswordDto, currentUser)
  }

  /**
   * 让指定 user/admin 的现有会话失效，但保留原密码。
   *
   * 这是超管的会话管理动作，不是代替用户设置密码；目标重新登录仍使用原凭据。
   */
  @Post(':id/force-logout')
  forceLogout(
    @Param('id', { schema: userIdSchema }) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.userService.forceLogout(id, currentUser)
  }

  /**
   * 软删除用户。
   *
   * 当前身份由全局 JWT Guard 从数据库恢复，Service 再检查超管角色、删除权限和目标保护规则。
   * Controller 不接收请求体，也不接受调用方传入的操作者 ID 或角色。
   */
  @Delete(':id')
  remove(
    @Param('id', { schema: userIdSchema }) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.userService.remove(id, currentUser)
  }
}
