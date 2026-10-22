import { ResumePdfConfigController } from './resume-pdf-config.controller'
import { ResumePdfConfigService } from './resume-pdf-config.service'
import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'
import { ResumePdfController } from './resume-pdf.controller'
import { ResumePdfRenderer, ResumePdfService } from './resume-pdf.service'

/**
 * 简历模块。
 *
 * `imports: [AuditModule]` 是为了拿到 `AuditService` 的**同一个单例** ——
 * 若改成在 `providers` 里再声明一次，就会出现两个实例（功能等价但破坏单例假设，
 * 将来加缓存/连接池时会出问题）。
 */
@Module({
  imports: [AuditModule],
  controllers: [ResumePdfConfigController, ResumeController, ResumePdfController],
  providers: [ResumePdfConfigService, ResumeService, ResumePdfService, ResumePdfRenderer],
  /**
   * 只导出**别的模块真正需要**的两个：
   * - `ResumeService`：`ShareModule` 要用 `findPublished`（它已带 `publishedAt` 过滤）
   * - `ResumePdfService`：分享的 PDF 下载要用 `exportForShare`
   *
   * 不整包导出：`exports` 一旦铺开，模块边界就靠自觉了 —— 以后谁想用什么直接就能拿到，
   * 依赖关系也就不再可读。
   *
   * ⚠️ 少了这一行，`ShareModule` 会在**启动时**抛
   * `UnknownDependenciesException: Nest can't resolve dependencies of the ShareService`，
   * 而 `typecheck` 完全看不出问题 —— 已由 `share.module.di.test.ts` 兜住。
   */
  exports: [ResumeService, ResumePdfService],
})
export class ResumeModule {}
