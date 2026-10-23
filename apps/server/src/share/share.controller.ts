import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
import type { ShareVisitorContext } from './share.types'
import { Throttle } from '@nestjs/throttler'
import { ResumePdfService } from '../resume/resume-pdf.service'
import { ShareThrottlerGuard } from './share-throttler.guard'
import { resumePrimaryKeySchema } from '@rs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import type { AuthUser } from '../common/http-context'
import { shareCreateSchema, type ShareCreateDto } from './dto/share-create.schema'
import { shareListQuerySchema, type ShareListQueryDto } from './dto/share-list.schema'
import { shareUpdateSchema, type ShareUpdateDto } from './dto/share-update.schema'
import { shareTokenSchema } from './dto/share-token.schema'
import { ShareService } from './share.service'

/**
 * 分享链接。
 *
 * 两类路由放在同一个控制器里，是因为它们是**同一件事的两端**（建/撤 vs 读），
 * 放在一起读代码时能直接看到"授权在这里写入、在那里校验"。
 */
@Controller()
export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly pdf: ResumePdfService,
  ) {}

  /** 建链接：要求简历属于本人且**已发布** */
  @Post('resume/:id/shares')
  create(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @Body({ schema: shareCreateSchema }) createDto: ShareCreateDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.shareService.create(id, createDto, currentUser)
  }

  /** 撤销（幂等）。物化撤销：写入后永久失效，重新发布也不复活 */
  @Delete('resume/:id/shares/:shareId')
  revoke(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @Param('shareId') shareId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.shareService.revoke(id, shareId, currentUser)
  }

  /**
   * 受控分享的公开读。`@Public()` —— 访客没有登录态，token 就是唯一凭证。
   *
   * ⚠️ 该路由**必须限流**（见 DAO-050 R1 剩余项）：公开端点 + 唯一凭证 = 暴力枚举的靶子。
   */
  @Public()
  @Get('share/:token')
  // 阈值覆盖模块级的默认值（那个是给登录用的 5 次/分钟）：分享是"打开页面"，不是"手动尝试"
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @UseGuards(ShareThrottlerGuard)
  read(
    @Param('token', { schema: shareTokenSchema }) token: string,
    // 访客维度**由服务端从请求里取**，不接受客户端上报 —— 否则 IP/UA 可被伪造
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referrer?: string,
  ) {
    const visitor: ShareVisitorContext = { ipAddress: ip, userAgent, referrer }
    return this.shareService.readByToken(token, visitor)
  }

  /**
   * 访客按链接下载 PDF（受 `allowPdf` 控制）。
   *
   * 访客没有登录态，所以走 `exportForShare`（归属已由 token 校验，也不需要 `documentHash`）。
   */
  @Public()
  @Post('share/:token/pdf')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(ShareThrottlerGuard)
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async downloadPdf(
    @Param('token', { schema: shareTokenSchema }) token: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referrer?: string,
  ): Promise<StreamableFile> {
    const { shareId, resumeId } = await this.shareService.assertPdfAllowed(token)
    const bytes = await this.pdf.exportForShare(resumeId)
    // 渲染成功之后才记：下载失败不该计入"下载过"
    this.shareService.recordPdfDownload(shareId, { ipAddress: ip, userAgent, referrer })
    return new StreamableFile(bytes, {
      type: 'application/pdf',
      disposition: `attachment; filename="resume.pdf"`,
      length: bytes.length,
    })
  }

  // ── 发布管理页（R4）──────────────────────────────────────────────────
  //
  // 路径用 `shares`（复数）而不是 `share/:token`：复数表示"我的一堆链接"，
  // 单数 + token 表示"凭券读取"。两者语义不同，不该长得像。

  /** 本人所有分享链接（可按状态 / 简历筛选） */
  @Get('shares')
  list(@Query({ schema: shareListQuerySchema }) query: ShareListQueryDto, @CurrentUser() currentUser: AuthUser) {
    return this.shareService.listOwned(query, currentUser)
  }

  /** 单条详情：元信息 + 事件统计（被看几次、下载过几次） */
  @Get('shares/:id')
  detail(@Param('id') id: string, @CurrentUser() currentUser: AuthUser) {
    return this.shareService.getOwnedDetail(id, currentUser)
  }

  /**
   * 改元信息（`label` / `note`）。
   *
   * 只允许这两项：`token` / `expiresAt` / `allowPdf` 是授权语义的一部分，
   * 改它们等于换了一条链接 —— 应当"新建 + 撤销旧的"，否则这条链接的历史事件会张冠李戴。
   */
  @Patch('shares/:id')
  update(
    @Param('id') id: string,
    @Body({ schema: shareUpdateSchema }) updateDto: ShareUpdateDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.shareService.updateOwnedMeta(id, updateDto, currentUser)
  }

  /** 按链接 id 撤销（管理页用；与 `DELETE resume/:id/shares/:shareId` 等价） */
  @Delete('shares/:id')
  revokeById(@Param('id') id: string, @CurrentUser() currentUser: AuthUser) {
    return this.shareService.revokeOwnedById(id, currentUser)
  }
}
