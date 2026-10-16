import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'

/**
 * 简历模块。
 *
 * `imports: [AuditModule]` 是为了拿到 `AuditService` 的**同一个单例** ——
 * 若改成在 `providers` 里再声明一次，就会出现两个实例（功能等价但破坏单例假设，
 * 将来加缓存/连接池时会出问题）。
 */
@Module({
  imports: [AuditModule],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
