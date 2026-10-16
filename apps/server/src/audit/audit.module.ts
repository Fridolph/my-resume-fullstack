import { Module } from '@nestjs/common'
import { AuditService } from './audit.service'

/**
 * 审计模块。
 *
 * 只导出 `AuditService`：其他业务模块（简历、用户）注入它，在**自己的事务里**写审计。
 * 这里**不注册全局 Guard / Filter** —— 审计不改变请求处理链，
 * 它只是被业务调用的一次写入。
 *
 * ⚠️ 重复注册是常见错误：`AuditService` 若在 `ResumeModule` / `UserModule` 里
 * 各自 `providers` 一份，就会出现两个实例（虽然无状态、功能上等价，
 * 但会让"单例"的假设失效，也让将来加缓存/连接池时出问题）。
 * 正确做法是各模块 `imports: [AuditModule]`。
 */
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
