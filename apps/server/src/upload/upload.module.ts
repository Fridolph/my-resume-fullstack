import { Module } from '@nestjs/common'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'

/**
 * 上传模块。
 *
 * `PrismaService` 与 `ConfigService` 由全局模块提供（见 `app.module.ts`），
 * 这里不重复 import —— 否则会造出第二个 Prisma 实例。
 */
@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
