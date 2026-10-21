import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { resumePrimaryKeySchema } from '@rs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import type { AuthUser } from '../common/http-context'
import { shareCreateSchema, type ShareCreateDto } from './dto/share-create.schema'
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
  constructor(private readonly shareService: ShareService) {}

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
  @Get('s/:token')
  read(@Param('token', { schema: shareTokenSchema }) token: string) {
    return this.shareService.readByToken(token)
  }
}
