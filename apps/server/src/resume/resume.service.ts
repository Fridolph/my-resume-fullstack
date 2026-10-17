import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import {
  buildResumeDocument,
  resumeDocumentSchema,
  type CreateResumeDto,
  type SaveResumeDraftDto,
  type RenameResumeDto,
  type ResumeDraftResponse,
  type ResumeSummary,
} from '@rs/common'
import type { Prisma } from '../generated/prisma/client'
import type { AuthUser } from '../common/http-context'
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
  async setDefault(id: number, currentUser: AuthUser, context: AuditContext = {}): Promise<ResumeSummary[]> {
    this.assertEditable(currentUser)

    await this.prismaService.$transaction(async transaction => {
      const target = await transaction.resume.findFirst({
        where: this.ownedResume(id, currentUser),
        select: { id: true, name: true },
      })
      if (!target) {
        throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
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

    return this.list(currentUser)
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
      await transaction.resumeWorkspace.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
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
  async list(currentUser: AuthUser): Promise<ResumeSummary[]> {
    const resumes = await this.prismaService.resume.findMany({
      where: {
        workspaceUserId: currentUser.userId,
        workspace: { user: { deletedAt: null } },
        draft: { isNot: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        locale: true,
        isDefault: true,
        draft: { select: { revision: true, updatedAt: true } },
      },
    })

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
      })
    }

    return items
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
   * 公开读取的过滤条件：**只保证"这份数据属于一个仍然有效的账号"**。
   *
   * 与 `ownedResume` 的差别就是少了 `workspaceUserId` ——
   * 那一条是**授权**（谁能读），这一条是**数据完整性**（这条数据是否还有效）。
   */
  private publishedResume(extra: Prisma.ResumeWhereInput): Prisma.ResumeWhereInput {
    return { ...extra, workspace: { user: { deletedAt: null } } }
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
      const updated = await transaction.resumeDraft.updateMany({
        where: {
          resumeId: id,
          revision: saveResumeDraftDto.expectedRevision,
          resume: this.ownedResume(id, currentUser),
        },
        data: {
          document: saveResumeDraftDto.document as unknown as Prisma.InputJsonValue,
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
