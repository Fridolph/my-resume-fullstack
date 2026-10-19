import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import {
  createResumeSchema,
  renameResumeSchema,
  resumePrimaryKeySchema,
  saveResumeDraftSchema,
  type CreateResumeDto,
  type RenameResumeDto,
  type SaveResumeDraftDto,
} from '@rs/common'
import { TraceId } from '../common/decorators/trace-id.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { resumeListSchema, type ResumeListDto } from './dto/resume-list.schema'
import { resumeDisplayUpdateSchema, type ResumeDisplayUpdateDto } from './dto/resume-display.schema'
import { resumePublishSchema, type ResumePublishDto } from './dto/resume-publish.schema'
import { Public } from '../auth/decorators/public.decorator'
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
  create(
    @Body({ schema: createResumeSchema }) createResumeDto: CreateResumeDto,
    @CurrentUser() currentUser: AuthUser,
    @TraceId() traceId: string,
  ) {
    return this.resumeService.create(createResumeDto, currentUser, { requestId: traceId })
  }

  /**
   * 列出**本人**未删除的简历（概览页）。
   *
   * 与 `GET :id/draft` 的分工：这里回答"我有哪些简历"，那条回答"某一份的正文"。
   * 身份取自 Guard，不接受客户端指定归属；普通用户也能读自己的列表（不需要编辑资格）。
   */
  @Get()
  list(@CurrentUser() currentUser: AuthUser, @Query({ schema: resumeListSchema }) query: ResumeListDto) {
    // 分页参数走 schema 校验（越界 400、缺省由 service 收敛）；
    // 身份仍只取 Guard 恢复的 `currentUser`，不接受客户端指定归属。
    return this.resumeService.list(currentUser, query)
  }

  /**
   * 读取本人完整草稿，含编辑所需全部内容；此接口不是公开展示入口。
   */
  /**
   * 默认展示的简历草稿（首页用）。
   *
   * ⚠️ 必须声明在 `@Get(':id/draft')` **之前**：NestJS 按声明顺序匹配，
   * 否则 `default` 会被当成 `:id` 去做数字校验而 400。
   */
  @Get('default')
  findDefault(@CurrentUser() currentUser: AuthUser) {
    return this.resumeService.findDefault(currentUser)
  }

  /**
   * 公开读取：**默认展示**的简历（首页 `/` 的数据源）。
   *
   * 与 `GET default` 的区别是本接口**不需要登录**（`@Public()`），且不看当前用户 ——
   * 访客与作者拿到的是同一份。`public` 前缀把"匿名可读"写在路径上，避免以后有人误以为
   * 它是"按当前用户"的接口而往里加身份判断。
   *
   * ⚠️ 同样必须早于 `@Get(':id/draft')`。
   */
  @Public()
  @Get('public')
  findPublishedDefault() {
    return this.resumeService.findPublishedDefault()
  }

  /**
   * 公开读取：**指定 id** 的简历（`/resume/:id` 的数据源）。
   *
   * 只按"账号是否仍然有效"过滤，不做所有权校验 —— 这正是"公开"的含义。
   * 找不到、或账号已被软删除，都返回 404（与项目一贯口径一致：不泄露存在性）。
   */
  @Public()
  @Get('public/:id')
  findPublished(@Param('id', { schema: resumePrimaryKeySchema }) id: number) {
    return this.resumeService.findPublished(id)
  }

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

  /**
   * 重命名本人简历（只改内部名称，不动正文）。
   *
   * 用 PATCH 而不是 PUT：这是一处局部修改，不是整份资源的替换；
   * 请求体由 `renameResumeSchema` 收窄到只有一个 `name`。
   */
  @Patch(':id')
  rename(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @Body({ schema: renameResumeSchema }) renameResumeDto: RenameResumeDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.resumeService.rename(id, renameResumeDto, currentUser)
  }

  /**
   * 删除本人简历（**物理删除**）：简历与其草稿一并消失，没有恢复入口 ——
   * 所以前端必须保留二次确认（见 DAO-033 的口径说明）。
   */
  /** 设为默认展示（互斥：会取消本人其他简历的默认），返回更新后的完整列表 */
  @Patch(':id/default')
  setDefault(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @CurrentUser() currentUser: AuthUser,
    @TraceId() traceId: string,
  ) {
    return this.resumeService.setDefault(id, currentUser, { requestId: traceId })
  }

  /**
   * 发布 / 取消发布（幂等）。
   *
   * 发布是「公开读可见」的开关 —— B1 之前公开接口只过滤「账号是否软删」，
   * 于是只要 id 已知，任何简历（含半成品）都能被外人读到。现在未发布一律 404。
   *
   * 与 `PATCH :id/default` 的关系：不变量是 **默认 ⇒ 已发布**。
   * 所以设为默认时会校验目标已发布（未发布返回 400 `Resume.Publish:required`），
   * 而取消发布若命中默认那份，会连带取消默认。
   * 由此产生一条**用户可见的操作顺序：先发布，再设默认**。
   */
  @Patch(':id/publish')
  setPublished(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @Body({ schema: resumePublishSchema }) resumePublishDto: ResumePublishDto,
    @CurrentUser() currentUser: AuthUser,
    @TraceId() traceId: string,
  ) {
    return this.resumeService.setPublished(id, resumePublishDto.published, currentUser, { requestId: traceId })
  }

  /**
   * 只更新展示配置（主题 / 版式 / 背景 / 显隐）；不推进 revision。
   *
   * 与 `PUT :id/draft` 分开的理由见 service 注释：内容是内容、外观是外观，
   * 两者用同一把乐观锁会让"一个人改正文、一个人调主题"互相 409。
   */
  @Patch(':id/display')
  updateDisplay(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @Body({ schema: resumeDisplayUpdateSchema }) resumeDisplayUpdateDto: ResumeDisplayUpdateDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.resumeService.updateDisplay(id, resumeDisplayUpdateDto, currentUser)
  }

  @Delete(':id')
  remove(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @CurrentUser() currentUser: AuthUser,
    @TraceId() traceId: string,
  ) {
    return this.resumeService.remove(id, currentUser, { requestId: traceId })
  }
}
