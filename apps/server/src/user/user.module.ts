import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { UserCreationGuard } from './user-creation.guard'

/**
 * 用户模块依赖声明。
 */
@Module({
  controllers: [UserController],
  providers: [UserService, UserCreationGuard],
})
export class UserModule {}
