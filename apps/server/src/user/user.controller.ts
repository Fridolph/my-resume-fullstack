import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import {
  createUserSchema,
  listUserSchema,
  updateUserSchema,
  userIdSchema,
  type CreateUserDto,
  type UpdateUserDto,
  type UsersDto,
} from './dto/user.schema'
import { UserService } from './user.service'
import { UserCreationGuard } from './user-creation.guard'

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
   * 修改用户。
   */
  @Patch(':id')
  update(
    @Param('id', { schema: userIdSchema }) id: string,
    @Body({ schema: updateUserSchema }) updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto)
  }

  /**
   * 软删除用户。
   */
  @Delete(':id')
  remove(@Param('id', { schema: userIdSchema }) id: string) {
    return this.userService.remove(id)
  }
}
