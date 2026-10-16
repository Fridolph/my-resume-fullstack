import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { UserCreationGuard } from './user-creation.guard'

/**
 * 用户模块依赖声明。
 *
 * `imports: [AuditModule]` 而不是自己 `providers: [AuditService]`：
 * 后者会让 Nest 造出第二个实例（虽然当前无状态、行为相同，但"审计服务只有一个"
 * 应该由容器保证，而不是靠它恰好无状态）。
 */
@Module({
  imports: [AuditModule],
  controllers: [UserController],
  providers: [UserService, UserCreationGuard],
})
export class UserModule {}
