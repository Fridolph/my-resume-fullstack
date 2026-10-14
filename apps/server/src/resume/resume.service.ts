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
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 编辑资格：**两个条件必须同时满足**——角色表达身份层级，权限键表达功能授权。
   *
   * 把条件提成命名变量正向表达，是为了避免误读：原来的写法把两个 `!` 条件用 `||` 连起来，
   * 容易被读成"满足其一即可"，而它的真实含义是 `!(是编辑角色 && 有编辑权限)`。
   */
  private assertEditable(currentUser: AuthUser) {
    const isEditorRole = currentUser.roleKeys.some(role => role === 'admin' || role === 'super_admin')
    const hasEditPermission = currentUser.permissionKeys.includes(PERMISSION_KEYS.RESUME_SECTIONS_EDIT)

    if (!isEditorRole || !hasEditPermission) {
      throw new ForbiddenException('当前身份没有编辑简历的资格', { errorCode: API_ERROR_CODES.RESUME_EDIT_FORBIDDEN })
    }
  }

  private ownedResume(id: number, currentUser: AuthUser): Prisma.ResumeWhereInput {
    return { id, workspaceUserId: currentUser.userId, deletedAt: null, workspace: { user: { deletedAt: null } } }
  }

  /**
   * 原子创建空间、简历和唯一草稿，服务端从认证身份设置所有权。
   * 用户写入再次检查软删除；任何一步失败均回滚，不留下空简历。
   */
  async create(createResumeDto: CreateResumeDto, currentUser: AuthUser): Promise<ResumeDraftResponse> {
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
              document: fullDocument,
              updatedBy: user.id,
            },
          },
        },
        select: { id: true },
      })
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
        deletedAt: null,
        workspace: { user: { deletedAt: null } },
        draft: { isNot: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        locale: true,
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
          document: saveResumeDraftDto.document,
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
   * 软删除本人简历。
   *
   * 只写 `deletedAt`，不做物理删除：草稿是用户内容的唯一副本，误删必须可追溯
   * （DAO-029 已确认口径：删除后列表不再出现、数据可追溯；本轮不提供恢复入口）。
   *
   * 再删一次同一份会 404 —— 因为 `ownedResume` 里带着 `deletedAt: null`，
   * 语义是"已经没有这份可删的简历了"，而不是悄悄返回成功。
   */
  async remove(id: number, currentUser: AuthUser): Promise<{ id: number }> {
    this.assertEditable(currentUser)

    const removed = await this.prismaService.resume.updateMany({
      where: this.ownedResume(id, currentUser),
      data: { deletedAt: new Date() },
    })
    if (removed.count !== 1) {
      throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
    }

    return { id }
  }
}
