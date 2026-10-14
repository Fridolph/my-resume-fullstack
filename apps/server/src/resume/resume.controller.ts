import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import {
  createResumeSchema,
  resumePrimaryKeySchema,
  saveResumeDraftSchema,
  type CreateResumeDto,
  type SaveResumeDraftDto,
} from '@rs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../common/http-context'
import { ResumeService } from './resume.service'

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  /**
   * 主动创建本人简历与初始草稿，不在读取接口中隐式创建。
   * 身份取自 Guard；Schema 拒绝客户端设置所有权和 revision。
   */
  @Post()
  create(@Body({ schema: createResumeSchema }) createResumeDto: CreateResumeDto, @CurrentUser() currentUser: AuthUser) {
    return this.resumeService.create(createResumeDto, currentUser)
  }

  /**
   * 列出**本人**未删除的简历（概览页）。
   *
   * 与 `GET :id/draft` 的分工：这里回答"我有哪些简历"，那条回答"某一份的正文"。
   * 身份取自 Guard，不接受客户端指定归属；普通用户也能读自己的列表（不需要编辑资格）。
   */
  @Get()
  list(@CurrentUser() currentUser: AuthUser) {
    return this.resumeService.list(currentUser)
  }

  /**
   * 读取本人完整草稿，含编辑所需全部内容；此接口不是公开展示入口。
   */
  @Get(':id/draft')
  findDraft(@Param('id', { schema: resumePrimaryKeySchema }) id: number, @CurrentUser() currentUser: AuthUser) {
    return this.resumeService.findDraft(id, currentUser)
  }

  /**
   * 按客户端期望 revision 保存完整文档；冲突返回 409，不能自动覆盖重试。
   */
  @Put(':id/draft')
  saveDraft(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @Body({ schema: saveResumeDraftSchema }) saveResumeDraftDto: SaveResumeDraftDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.resumeService.saveDraft(id, saveResumeDraftDto, currentUser)
  }
}
