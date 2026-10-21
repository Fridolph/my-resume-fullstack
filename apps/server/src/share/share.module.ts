import { Module } from '@nestjs/common'
import { ResumeModule } from '../resume/resume.module'
import { ShareController } from './share.controller'
import { ShareService } from './share.service'

/** 分享链接。依赖 `ResumeModule` 以复用 `findPublished`（它已经带 `publishedAt` 过滤）。 */
@Module({
  imports: [ResumeModule],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
