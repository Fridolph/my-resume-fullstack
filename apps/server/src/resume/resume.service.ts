import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  buildResumeDocument,
  defaultResumePdfConfig,
  resumeDocumentSchema,
  resumePdfConfigSchema,
  toResumePdfPreset,
  type CreateResumeDto,
  type SaveResumeDraftDto,
  type RenameResumeDto,
  type ResumeDraftResponse,
  type ResumeSummary,
  type ResumeSummaryPage,
  type ResumeDocument,
} from '@rs/common'
import type { Prisma } from '../generated/prisma/client'
import type { AuthUser } from '../common/http-context'
import type { ResumeListDto } from './dto/resume-list.schema'
import type { ResumeDisplayUpdateDto } from './dto/resume-display.schema'
import { API_ERROR_CODES } from '../common/error-codes'
import { PERMISSION_KEYS } from '../auth/permission-keys'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuditContext } from '../audit/audit.types'

const draftInclude = { resume: { select: { id: true, name: true, locale: true } } } as const
type DraftRecord = Prisma.ResumeDraftGetPayload<{ include: typeof draftInclude }>

function toResponse(draft: DraftRecord): ResumeDraftResponse {
  return {
    resume: draft.resume,
    revision: draft.revision,
    updatedAt: draft.updatedAt.toISOString(),
    document: resumeDocumentSchema.parse(draft.document),
  }
}

@Injectable()
export class ResumeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 编辑资格：**两个条件必须同时满足**——角色表达身份层级，权限键表达功能授权。
   *
   * 把条件提成命名变量正向表达，是为了避免误读：原来的写法把两个 `!` 条件用 `||` 连起来，
   * 容易被读成"满足其一即可"，而它的真实含义是 `!(是编辑角色 && 有编辑权限)`。
   */
  /**
   * 把某人一份简历设为「默认展示」，并**取消他其他简历的默认**。
   *
   * 互斥在同一个事务里完成：先清后置。没有加数据库唯一约束（`WHERE is_default` 的部分唯一索引
   * 在 Prisma schema 里表达不了，硬加会让 `migrate dev` 每次报漂移），所以这里用事务把窗口收窄 ——
   * 同一用户并发调用极小概率仍可能出现两份默认，代价只是"首页取到其中一份"，
   * 用户再点一次即可收敛；相对地，唯一索引会带来的长期漂移成本更麻烦。
   *
   * 返回**更新后的完整列表**，让前端一次拿到互斥结果，不用再猜另一份现在是 true 还是 false。
   */
  async setDefault(id: number, currentUser: AuthUser, context: AuditContext = {}): Promise<{ id: number }> {
    this.assertEditable(currentUser)

    await this.prismaService.$transaction(async transaction => {
      const target = await transaction.resume.findFirst({
        where: this.ownedResume(id, currentUser),
        select: { id: true, name: true, publishedAt: true },
      })
      if (!target) {
        throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
      }

      // 不变量：**`isDefault` ⇒ 已发布**。默认展示的那份必须能被公开读到，
      // 否则首页会指向一份 404 的内容 —— 那比"没设默认"更难排查。
      // 这里选择**拒绝**而不是自动帮它发布：自动发布等于静默扩大暴露面，
      // 而"公开"这件事必须由作者明确表达（Owner 2026-10-17 确认此口径）。
      if (!target.publishedAt) {
        throw new BadRequestException('请先发布该简历，再设为默认展示', {
          errorCode: API_ERROR_CODES.RESUME_NOT_PUBLISHED,
        })
      }

      // 记录"被顶掉的那一份"：状态变更的追责价值在于**变更前是什么**，
      // 而不是变更后 —— 后者可以直接查当前数据得到
      const previous = await transaction.resume.findFirst({
        where: { workspaceUserId: currentUser.userId, isDefault: true, id: { not: id } },
        select: { id: true },
      })

      await transaction.resume.updateMany({
        where: { workspaceUserId: currentUser.userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
      await transaction.resume.update({ where: { id }, data: { isDefault: true } })

      await this.auditService.recordResumeSetDefault(transaction, currentUser, {
        resumeId: id,
        name: target.name,
        previousDefaultId: previous?.id,
        requestId: context.requestId,
      })
    })

    // 返回值从"整份列表"收成 `{ id }`：列表现在**分页**了，返回"全部"既昂贵又语义含混
    //（调用方拿到的是第几页？）。调用方真正需要的是"哪一份成了默认"，
    // 其余状态用一次重新拉取（列表已有缓存失效机制）就够了。
    return { id }
  }

  /**
   * 发布 / 取消发布（幂等）。
   *
   * ## 为什么与 `setDefault` 同一条授权口径
   *
   * 发布决定「外人能不能看到」—— 与「哪一份是默认」同级的写操作。
   * 两者若授权不一致，就会出现「能设默认却不能发布」这种读不懂的权限缺口。
   *
   * ## 取消发布时**连带取消默认**
   *
   * 不变量是 **`isDefault` ⇒ 已发布**。所以取消发布若命中的正是默认那份，
   * 这里一并把 `isDefault` 清掉，否则首页会指向一份 404 的内容。
   *
   * 这与「自动帮它发布」方向相反、性质也不同：自动发布是**扩大暴露面**，
   * 不该静默做；清默认是**收窄暴露面**，且正是「我要把它撤下来」这个意图的必然结果。
   *
   * ## 幂等：重复发布不刷新时间戳
   *
   * `published ? (target.publishedAt ?? new Date()) : null` —— 已经发布过就保留首次发布时间，
   * 否则「点两次」会让发布日变成今天，分享页上那个「发布于」就没意义了。
   *
   * @returns 该简历的 `id` 与新的 `publishedAt`（ISO 字符串或 `null`），供前端就地更新，
   *          不必为了一次状态变更重新拉整页列表
   */
  async setPublished(
    id: number,
    published: boolean,
    currentUser: AuthUser,
    context: AuditContext = {},
  ): Promise<{ id: number; publishedAt: string | null }> {
    this.assertEditable(currentUser)

    return this.prismaService.$transaction(async transaction => {
      const target = await transaction.resume.findFirst({
        where: this.ownedResume(id, currentUser),
        select: { id: true, name: true, publishedAt: true, isDefault: true },
      })
      if (!target) {
        throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
      }

      const updated = await transaction.resume.update({
        where: { id },
        data: { publishedAt: published ? (target.publishedAt ?? new Date()) : null },
        select: { id: true, publishedAt: true },
      })

      // 取消发布命中默认那份时，一并清掉默认，维持 `isDefault` ⇒ 已发布 的不变量
      if (!published && target.isDefault) {
        await transaction.resume.update({ where: { id }, data: { isDefault: false } })
      }

      // **物化撤销该简历的所有分享链接**（Owner 2026-10-19 定的语义）。
      //
      // 为什么必须在"取消发布"这里真的写 `revokedAt`，而不是读的时候判断：
      // 派生判断（`publishedAt IS NULL` ⇒ 不可读）会让**重新发布后旧链接复活** ——
      // 一条已经发给外部、可能已经扩散的链接，不该因为作者"改一下再发"而悄悄恢复可用。
      // 所以撤销是**永久**的，重新分享必须新建链接。
      //
      // 与这次可见性变更**同一个事务**：撤销与取消发布要么都成立、要么都不成立，
      // 否则会出现"简历已下架、但链接还能打开"的窗口。
      if (!published) {
        await transaction.shareLink.updateMany({
          where: { resumeId: id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'unpublished' },
        })
      }

      // 与写状态**同一个事务**：审计缺席时这次可见性变更也不该成立（与删除、设默认同一口径）
      await this.auditService.recordResumeSetPublished(transaction, currentUser, {
        resumeId: id,
        name: target.name,
        published,
        requestId: context.requestId,
      })

      return { id: updated.id, publishedAt: updated.publishedAt?.toISOString() ?? null }
    })
  }

  /**
   * 取「默认展示」简历的草稿 —— 首页（`/`）用它决定直接展示哪一份。
   *
   * 没设默认时**不隐式挑一份**（比如最近更新的）：那会让"展示哪一份"变得不可预期，
   * 前端拿到 404 就引导用户去列表页自己选，选完在这里设默认。
   */
  async findDefault(currentUser: AuthUser): Promise<ResumeDraftResponse> {
    const resume = await this.prismaService.resume.findFirst({
      where: {
        workspaceUserId: currentUser.userId,
        isDefault: true,
        workspace: { user: { deletedAt: null } },
      },
      select: { id: true },
    })
    if (!resume) {
      throw new NotFoundException('还没有设为默认展示的简历', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
    }

    return this.findDraft(resume.id, currentUser)
  }

  private assertEditable(currentUser: AuthUser) {
    const isEditorRole = currentUser.roleKeys.some(role => role === 'admin' || role === 'super_admin')
    const hasEditPermission = currentUser.permissionKeys.includes(PERMISSION_KEYS.RESUME_SECTIONS_EDIT)

    if (!isEditorRole || !hasEditPermission) {
      throw new ForbiddenException('当前身份没有编辑简历的资格', { errorCode: API_ERROR_CODES.RESUME_EDIT_FORBIDDEN })
    }
  }

  /**
   * 本人简历的可访问条件。
   *
   * 只约束**所有权**与"简历主人是否还在"：
   * 简历本身没有软删字段（删除即物理删除，见 `Resume` 模型与 DAO-033），
   * 所以这里不需要 `deletedAt: null`；而 `workspace.user.deletedAt` 仍要查 ——
   * 用户是软删的，被删账号的简历不该继续被读写。
   */
  private ownedResume(id: number, currentUser: AuthUser): Prisma.ResumeWhereInput {
    return { id, workspaceUserId: currentUser.userId, workspace: { user: { deletedAt: null } } }
  }

  /**
   * 原子创建空间、简历和唯一草稿，服务端从认证身份设置所有权。
   * 用户写入再次检查软删除；任何一步失败均回滚，不留下空简历。
   *
   * 显式传入的 PDF 配置（例如复制简历）优先保留；缺省时在创建事务中读取
   * 本人公共预设，或采用系统默认，并存为新草稿的独立快照。预设后续更新
   * 不追改既有简历；公共预设不携带其他简历的模块实例 ID。
   */
  async create(
    createResumeDto: CreateResumeDto,
    currentUser: AuthUser,
    context: AuditContext = {},
  ): Promise<ResumeDraftResponse> {
    this.assertEditable(currentUser)
    // 客户端的 document 是稀疏输入：先补全成完整 V1 文档再入库。
    // schemaVersion 由服务端固定写 1 —— 输入里即使带了同名值也被忽略，不采用客户端提供的版本号。
    // 补全是纯计算，放在事务外，避免占用事务时间。
    const fullDocument = buildResumeDocument(createResumeDto.document)
    return this.prismaService.$transaction(async transaction => {
      const user = await transaction.user.findFirst({
        where: { id: currentUser.userId, deletedAt: null },
        select: { id: true },
      })
      if (!user) throw new NotFoundException('用户不可用', { errorCode: API_ERROR_CODES.AUTH_USER_UNAVAILABLE })
      const workspace = await transaction.resumeWorkspace.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
        select: { pdfConfig: true },
      })
      if (!fullDocument.display.pdf) {
        fullDocument.display.pdf = workspace.pdfConfig
          ? toResumePdfPreset(resumePdfConfigSchema.parse(workspace.pdfConfig))
          : defaultResumePdfConfig()
      }
      const resume = await transaction.resume.create({
        data: {
          name: createResumeDto.name,
          locale: createResumeDto.locale,
          workspaceUserId: user.id,
          draft: {
            create: {
              schemaVersion: fullDocument.schemaVersion,
              // 断言：文档已由 `resumeDocumentSchema` 校验过，运行时就是可序列化的 JSON；
              // 但 `richText` 的内容形状刻意写成浅类型（`unknown`），TS 才需要这一步
              document: fullDocument as unknown as Prisma.InputJsonValue,
              updatedBy: user.id,
            },
          },
        },
        select: { id: true },
      })
      // 与创建同一个事务：创建回滚则这条记录也不留。
      // 放在 `resume.create` 之后：审计需要简历 id；而名字本来就在入参里，
      // 所以这里不存在"快照要在删除前取"那种时机问题。
      await this.auditService.recordResumeCreation(transaction, currentUser, {
        resumeId: resume.id,
        name: createResumeDto.name,
        locale: createResumeDto.locale,
        requestId: context.requestId,
      })

      // where 里已保证 draft 存在；这里只是为了让 TS 收窄类型
      const draft = await transaction.resumeDraft.findUniqueOrThrow({
        where: { resumeId: resume.id },
        include: draftInclude,
      })
      return toResponse(draft)
    })
  }

  /**
   * 列出**本人**未删除的简历，供概览页展示。
   *
   * 只取列表展示所需字段，**不取 document**：列表页不该为了显示标题去解析每份完整正文；
   * 需要正文时走 `findDraft`（那是编辑入口，不是列表入口）。
   *
   * 越权语义与单条接口一致：查询条件里带 `workspaceUserId`，所以"别人的简历"不是被过滤掉，
   * 而是根本不在结果集里 —— 不需要额外权限判断，也不该为超管另开一条读他人列表的口子。
   *
   * 排序按**简历创建时间倒序**（新建的在前，符合"刚建完想看它"的直觉）；
   * `draft.updatedAt` 只用于展示"最近改动"，不参与排序。
   *
   * 查询条件要求草稿存在（`draft: { isNot: null }`）：create 在同一事务里建简历与初始草稿，
   * "有简历必有草稿"是数据不变量；真出现无草稿的脏数据，宁可让它不出现，
   * 也不用猜测出来的 revision 把它伪装成正常简历返回。
   */
  async list(currentUser: AuthUser, query: ResumeListDto = {}): Promise<ResumeSummaryPage> {
    // 收敛规则与审计查询一致：page 从 1 起、pageSize 上限 100。
    // 放在 service 而不只放 schema：将来若有非 HTTP 入口（内部任务、CLI），
    // 绕过 schema 也不会把 `pageSize=100000` 打到数据库上。
    const page = Math.max(1, Math.trunc(query.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 20)))

    // 查询条件分三段：**归属与有效性**（恒定）、**搜索**（可选）、**筛选**（可选）。
    // 三段写在同一处而不是拆成一堆变量再 spread —— 读这个接口时就该能一眼看出"它能查到什么"。
    const keyword = query.q?.trim()

    // 分页的两个查询用**同一个 where**：count 与 findMany 条件不一致时，
    // "共 N 条"与实际能翻到的条数会对不上，而这种错误只在跨页时才显形。
    const where: Prisma.ResumeWhereInput = {
      workspaceUserId: currentUser.userId,
      workspace: { user: { deletedAt: null } },
      draft: { isNot: null },
      ...(keyword ? { name: { contains: keyword, mode: 'insensitive' } } : {}),
      // ⚠️ 必须判 `=== undefined`，不能写成 `if (query.published)` ——
      // 那会把"只看未发布"（false）当成"没传"，于是筛选静默失效
      ...(query.published === undefined ? {} : { publishedAt: query.published ? { not: null } : null }),
    }

    // 排序：白名单字段（见 dto 的 RESUME_LIST_SORTS）+ **稳定的次级键**。
    // `name` / `createdAt` / 草稿的 `updatedAt` 都可能重复，没有 `id` 兜底时
    // LIMIT/OFFSET 的顺序不稳定，会出现"同一条记录在两页里各出现一次"。
    const sort = query.sort ?? 'updatedAt'
    const order = query.order ?? 'desc'
    const orderBy: Prisma.ResumeOrderByWithRelationInput[] = [
      sort === 'name' ? { name: order } : sort === 'createdAt' ? { createdAt: order } : { draft: { updatedAt: order } },
      { id: 'desc' },
    ]

    const [resumes, total] = await this.prismaService.$transaction([
      this.prismaService.resume.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          locale: true,
          isDefault: true,
          publishedAt: true,
          draft: { select: { revision: true, updatedAt: true } },
        },
      }),
      this.prismaService.resume.count({ where }),
    ])

    const items: ResumeSummary[] = []
    for (const resume of resumes) {
      if (!resume.draft) continue
      items.push({
        id: resume.id,
        name: resume.name,
        locale: resume.locale,
        revision: resume.draft.revision,
        updatedAt: resume.draft.updatedAt.toISOString(),
        isDefault: resume.isDefault,
        publishedAt: resume.publishedAt?.toISOString() ?? null,
      })
    }

    return { items, total, page, pageSize }
  }

  /**
   * 只更新**展示配置**（主题 / 版式 / 背景 / 模块显隐），不动内容、**不推进 revision**。
   *
   * ## 为什么单独开一个接口，而不是让内容保存顺带存 display
   *
   * `revision` 是**内容**的乐观锁：两个人一个改正文、一个调主题，不该互相 409。
   * 所以外观走这条独立的写路径，只覆盖 `document.display`。
   *
   * ## 权限
   *
   * 需要 `Resume.Display:edit`（此前这个键**零实现**，只有前端在判断），
   * 加所有权校验（`ownedResume`）—— 与 `assertEditable` 里的角色判断互补：
   * 权限键表达"功能是否授权"，所有权表达"是不是你的简历"。
   *
   * ## 并发
   *
   * 在事务里读取文档后，仅替换网页配置并保留最新 PDF 配置。
   * 写入带完整旧 JSON 的 CAS 条件：期间任何写路径改变文档都返回409，
   * 不以旧快照覆盖新正文/纸面；正文 revision 仍保持不变。
   */
  async updateDisplay(
    id: number,
    resumeDisplayUpdateDto: ResumeDisplayUpdateDto,
    currentUser: AuthUser,
  ): Promise<{ display: ResumeDocument['display'] }> {
    if (!currentUser.permissionKeys.includes(PERMISSION_KEYS.RESUME_DISPLAY_EDIT)) {
      throw new ForbiddenException('当前身份不能修改展示配置', {
        errorCode: API_ERROR_CODES.RESUME_EDIT_FORBIDDEN,
      })
    }

    return this.prismaService.$transaction(async transaction => {
      const draft = await transaction.resumeDraft.findFirst({
        where: { resume: this.ownedResume(id, currentUser) },
        select: { id: true, document: true },
      })

      if (!draft) {
        throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
      }

      // 先按 schema 解析再合并：库里可能有旧版本文档，直接改字段会把形状问题带下去
      const document = resumeDocumentSchema.parse(draft.document)
      // 该路径只编辑网页，保留最新纸面配置，不能由旧客户端整块 display 覆盖。
      const { pdf: ignoredPdf, ...webDisplay } = resumeDisplayUpdateDto.display
      void ignoredPdf
      const next: ResumeDocument = {
        ...document,
        display: { ...webDisplay, ...(document.display.pdf ? { pdf: document.display.pdf } : {}) },
      }

      const updated = await transaction.resumeDraft.updateMany({
        where: { id: draft.id, document: { equals: draft.document as Prisma.InputJsonValue } },
        // 只写 document 与 updatedBy；**不碰 revision**（见方法注释）
        data: { document: next as Prisma.InputJsonValue, updatedBy: currentUser.userId },
      })

      if (!updated.count) throw new ConflictException('简历已变化，请重新读取后保存外观')
      return { display: next.display }
    })
  }

  /**
   * 所有权与可用状态进入查询条件，他人、删除和不存在统一 404。
   * 即使超管也不能通过该本人草稿接口读取他人的内容。
   */
  async findDraft(id: number, currentUser: AuthUser): Promise<ResumeDraftResponse> {
    const draft = await this.prismaService.resumeDraft.findFirst({
      where: { resume: this.ownedResume(id, currentUser) },
      include: draftInclude,
    })
    if (!draft) throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
    return toResponse(draft)
  }

  /**
   * 读「公开」草稿：**访客可读，不做所有权过滤**。
   *
   * 与 `findDraft` 的分工是本卡的核心取舍：
   * - `findDraft` 回答"**我的**草稿"，`where` 里带 `workspaceUserId`，连超管也读不到别人的；
   * - 本方法回答"**这份**内容是什么"，只过滤"账号是否仍然有效"，因此只应由 `@Public()` 路由调用。
   *
   * 为什么不合并成一个"按身份可选过滤"的方法：那会让 `where` 的形状随调用方身份漂移，
   * 权限模型再也读不出"这个接口到底允不允许外人读"。分成两条路由，语义就留在路由表上。
   *
   * ⚠️ 已知口径（DAO-038）：本轮**没有"已发布"字段**，所以只要 id 已知，任何简历都能被读到
   * （含半成品）。引入发布态时，这里就是加过滤条件的地方。
   */
  async findPublished(id: number): Promise<ResumeDraftResponse> {
    const draft = await this.prismaService.resumeDraft.findFirst({
      where: { resume: this.publishedResume({ id }) },
      include: draftInclude,
    })
    if (!draft) throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
    return toResponse(draft)
  }

  /**
   * 读「默认展示」的公开草稿 —— 首页（`/`）用它决定访客看到哪一份。
   *
   * 没设默认时**不隐式挑一份**（比如"最近更新的"）：那会让"展示哪一份"变得不可预期。
   * 前端拿到 404 就展示空态，并引导作者去列表页设置默认。
   */
  async findPublishedDefault(): Promise<ResumeDraftResponse> {
    const draft = await this.prismaService.resumeDraft.findFirst({
      where: { resume: this.publishedResume({ isDefault: true }) },
      include: draftInclude,
    })
    if (!draft) {
      throw new NotFoundException('还没有设为默认展示的简历', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
    }
    return toResponse(draft)
  }

  /**
   * 公开读取的过滤条件：**已发布 + 账号仍有效**。
   *
   * 两条判据各回答一个问题：
   * - `publishedAt: { not: null }` —— **作者有没有主动公开这份内容**（授权面）；
   * - `workspace: { user: { deletedAt: null } }` —— **这条数据是否还有效**（数据完整性）。
   *
   * 与 `ownedResume` 的差别是少了 `workspaceUserId`：那个条件是「只看自己的」，
   * 而公开读的口径是「作者公开过的、任何人的」。
   *
   * ⚠️ 这里是 `findPublished` 与 `findPublishedDefault` 的**唯一收口点** ——
   * 发布态只需加一次就同时覆盖两个公开读接口。
   * 加这条过滤之前（DAO-038），只要 id 已知，任何简历都能被读到（含写了一半的草稿）；
   * B1（上线门槛）关的正是这条。
   */
  private publishedResume(extra: Prisma.ResumeWhereInput): Prisma.ResumeWhereInput {
    return { ...extra, publishedAt: { not: null }, workspace: { user: { deletedAt: null } } }
  }

  /**
   * 单条条件更新比较 revision 并递增，避免先读后写的并发覆盖。
   * 文档、版本号和操作者同时提交，事务内读取本次保存结果；失败保持原草稿。
   */
  async saveDraft(
    id: number,
    saveResumeDraftDto: SaveResumeDraftDto,
    currentUser: AuthUser,
  ): Promise<ResumeDraftResponse> {
    this.assertEditable(currentUser)
    return this.prismaService.$transaction(async transaction => {
      const resume = await transaction.resume.findFirst({
        where: this.ownedResume(id, currentUser),
        select: { id: true },
      })
      if (!resume) throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
      const current = await transaction.resumeDraft.findUnique({ where: { resumeId: id } })
      if (!current) throw new NotFoundException('草稿不存在')
      const currentDocument = resumeDocumentSchema.parse(current.document)
      const { pdf: ignoredPdf, ...incomingDisplay } = saveResumeDraftDto.document.display
      void ignoredPdf
      const pdf = currentDocument.display.pdf
      const sectionIds = new Set(saveResumeDraftDto.document.content.sections.map(section => section.id))
      // 正文删除模块时清理纸面引用；排版选项仍保留最新保存值。
      const nextPdf = pdf
        ? {
            ...pdf,
            sections: {
              ...pdf.sections,
              order: pdf.sections.order.filter(value => sectionIds.has(value)),
              hidden: pdf.sections.hidden.filter(value => sectionIds.has(value)),
            },
          }
        : undefined
      const nextDocument = {
        ...saveResumeDraftDto.document,
        display: { ...incomingDisplay, ...(nextPdf ? { pdf: nextPdf } : {}) },
      }
      const updated = await transaction.resumeDraft.updateMany({
        where: {
          resumeId: id,
          document: { equals: current.document as Prisma.InputJsonValue },
          revision: saveResumeDraftDto.expectedRevision,
          resume: this.ownedResume(id, currentUser),
        },
        data: {
          document: nextDocument as unknown as Prisma.InputJsonValue,
          schemaVersion: saveResumeDraftDto.document.schemaVersion,
          revision: { increment: 1 },
          updatedBy: currentUser.userId,
        },
      })
      if (updated.count !== 1)
        throw new ConflictException('草稿已被其他窗口修改，请备份当前输入再重新读取', {
          errorCode: API_ERROR_CODES.RESUME_DRAFT_CONFLICT,
        })
      await transaction.resume.update({ where: { id }, data: { updatedAt: new Date() } })
      const draft = await transaction.resumeDraft.findUniqueOrThrow({ where: { resumeId: id }, include: draftInclude })
      return toResponse(draft)
    })
  }

  /**
   * 重命名本人简历（只改内部名称，不动正文）。
   *
   * 复用 `ownedResume` 作为更新条件：他人、已删除、不存在都落进"更新 0 行"这一种结果，
   * 统一按 404 返回，不泄露某份简历是否存在。
   *
   * **这里不需要 revision**：名字是单字段整体覆盖，最后写入者生效即可 ——
   * 它不会像整份文档那样把别人的改动整段抹掉，为它加版本号只会让调用方多背一个并发概念。
   */
  async rename(
    id: number,
    renameResumeDto: RenameResumeDto,
    currentUser: AuthUser,
  ): Promise<{ id: number; name: string }> {
    this.assertEditable(currentUser)

    const updated = await this.prismaService.resume.updateMany({
      where: this.ownedResume(id, currentUser),
      data: { name: renameResumeDto.name },
    })
    if (updated.count !== 1) {
      throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
    }

    return { id, name: renameResumeDto.name }
  }

  /**
   * 删除本人简历（**物理删除**，不是打标记）。
   *
   * 与账号不同，简历不留软删痕迹：正文是用户自己生成的内容，删掉就是不要了 ——
   * 软删只会让库里持续积累看不见的简历与草稿（本卡实测：24 份里 21 份是历史软删积压），
   * 属于污染而不是保护。需要留痕的是账号（`User` 仍有 `deletedAt`）。
   *
   * 草稿由其外键 `onDelete: Cascade` 一并删除，所以这里只有一条 DELETE ——
   * 不会出现"简历删了、草稿还在"的中间态，也不必在应用层写两步清理。
   *
   * 用 `deleteMany` 而不是 `delete`：前者把"不存在 / 不是我的 / 主人已删"都收敛成
   * `count === 0`，正好对应统一的 404 口径；`delete` 会抛 Prisma 的 P2025，那属于把
   * 数据库异常当业务分支用。**重复删除仍然是 404**，不会静默成功。
   */
  async remove(id: number, currentUser: AuthUser, context: AuditContext = {}): Promise<{ id: number }> {
    this.assertEditable(currentUser)

    return this.prismaService.$transaction(async transaction => {
      // ⚠️ **先读快照，再删除**：删掉之后就没有东西可以快照了。
      // 这也解释了为什么"审计不靠外键"：快照必须在删除动作**发生之前**取下来。
      const target = await transaction.resume.findFirst({
        where: this.ownedResume(id, currentUser),
        select: { id: true, name: true, isDefault: true, draft: { select: { revision: true, document: true } } },
      })
      if (!target) {
        throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
      }

      const removed = await transaction.resume.deleteMany({
        where: this.ownedResume(id, currentUser),
      })
      if (removed.count !== 1) {
        // 并发下另一个请求先删掉了：同样按 404 处理，不留半条审计
        throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
      }

      await this.auditService.recordResumeDeletion(transaction, currentUser, {
        resumeId: id,
        name: target.name,
        revision: target.draft?.revision,
        sectionCount: countResumeSections(target.draft?.document),
        wasDefault: target.isDefault,
        requestId: context.requestId,
      })

      return { id }
    })
  }
}

/**
 * 从草稿文档里数出模块数。
 *
 * 模块在 `document.content.sections` 这个 **JSON 数组**里，Prisma 无法直接 `count`；
 * 删除是低频动作，为此多读一次文档是可以接受的代价 ——
 * 换来的是"删掉的是一份 12 模块的完整简历，还是一份空壳"这个可判断的事实。
 */
function countResumeSections(document: unknown): number | undefined {
  const sections = (document as { content?: { sections?: unknown[] } } | null | undefined)?.content?.sections
  return Array.isArray(sections) ? sections.length : undefined
}
