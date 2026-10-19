import { BadRequestException, Controller, Post, UploadedFiles, Body, UseInterceptors } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { UPLOAD_MAX_FILE_BYTES, UPLOAD_MAX_FILES, type UploadedFile } from '@rs/common'
import { API_ERROR_CODES } from '../common/error-codes'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../common/http-context'
import { UploadService } from './upload.service'
import { normalizePurpose, type UploadedFileLike } from './upload.rules'

/**
 * 通用上传入口（`POST /api/upload/files`）。
 *
 * ## 契约
 *
 * - `multipart/form-data`，文件字段名 **`files`**（单/多统一：一个也是数组）
 * - 附加字段 `purpose`（可选，默认 `resume-asset`）：决定磁盘一级目录
 * - 响应走全局统一包装，`data` 是 `UploadedFile[]`
 *
 * ## 为什么挂在全局 JWT Guard 下
 *
 * 上传是写操作，匿名可传等于开放一个免费文件主机。`@Public()` 一律不加。
 *
 * ## 为什么限制写在拦截器与 Service 两处
 *
 * multer 的 `limits.fileSize` 是**流式截断**的第一道闸（省内存）；
 * Service 里的 `validateUpload` 是**业务边界**（类型白名单、明确文案）。
 * 只有前者的话，将来换存储实现就没第二道；只有后者的话，超大文件会先被读进内存。
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('files')
  @UseInterceptors(
    FilesInterceptor('files', UPLOAD_MAX_FILES, {
      // 不显式给 storage：Nest 的 FilesInterceptor 默认就是**内存存储**，
      // 我们在 Service 里拿 buffer 校验后再落盘（见 upload.service 的说明）
      limits: { fileSize: UPLOAD_MAX_FILE_BYTES },
    }),
  )
  upload(
    @UploadedFiles() files: UploadedFileLike[] | undefined,
    @Body('purpose') purpose: string | undefined,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UploadedFile[]> {
    const normalized = normalizePurpose(purpose)
    if (!normalized) {
      throw new BadRequestException(`不支持的用途：${purpose}`, {
        errorCode: API_ERROR_CODES.UPLOAD_INVALID,
      })
    }

    return this.uploadService.saveMany(files ?? [], normalized, currentUser)
  }
}
