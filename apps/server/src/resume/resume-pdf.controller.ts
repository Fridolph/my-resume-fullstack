import { Body, Controller, Header, HttpCode, Param, Post, StreamableFile } from '@nestjs/common'
import { resumePdfExportSchema, resumePrimaryKeySchema, type ResumePdfExportDto } from '@rs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../common/http-context'
import { ResumePdfService } from './resume-pdf.service'

/** 下载沿用全局登录 Guard；不允许客户端指定 HTML、渲染 URL 或归属用户。 */
@Controller('resume')
export class ResumePdfController {
  constructor(private readonly pdf: ResumePdfService) {}

  /** 成功直接返回 PDF 字节，异常仍由全局过滤器输出标准 JSON。 */
  @Post(':id/pdf')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @Body({ schema: resumePdfExportSchema }) input: ResumePdfExportDto,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<StreamableFile> {
    const bytes = await this.pdf.export(id, input, currentUser)
    return new StreamableFile(bytes, {
      type: 'application/pdf',
      disposition: `attachment; filename="resume-${id}.pdf"`,
      length: bytes.length,
    })
  }
}
