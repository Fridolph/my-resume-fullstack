import { Module } from '@nestjs/common'
import { AuditController } from './audit.controller'
import { AuditService } from './audit.service'

/**
 * 审计模块。
 *
 * 导出 `AuditService` 供业务模块在**自己的事务里**写审计
 *（各模块应 `imports: [AuditModule]`，而不是各自 `providers` 一份 —— 那会造出多个实例）。
 *
 * `AuditController` 只承载**读**（超管查阅）；写入口在业务动作里，不在这里开。
 * 这个"写在内、读在外"的分布是刻意的：写必须与业务同事务，读才独立成接口。
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
