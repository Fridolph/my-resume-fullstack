import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import {
  buildResumeDocument,
  resumeDocumentSchema,
  type CreateResumeDto,
  type SaveResumeDraftDto,
  type ResumeDraftResponse,
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

  private assertEditable(currentUser: AuthUser) {
    if (
      !currentUser.roleKeys.some(role => role === 'admin' || role === 'super_admin') ||
      !currentUser.permissionKeys.includes(PERMISSION_KEYS.RESUME_SECTIONS_EDIT)
    ) {
      throw new ForbiddenException('当前身份没有编辑简历的资格', { errorCode: API_ERROR_CODES.RESUME_EDIT_FORBIDDEN })
    }
  }

  private ownedResume(id: string, currentUser: AuthUser): Prisma.ResumeWhereInput {
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
   * 所有权与可用状态进入查询条件，他人、删除和不存在统一 404。
   * 即使超管也不能通过该本人草稿接口读取他人的内容。
   */
  async findDraft(id: string, currentUser: AuthUser): Promise<ResumeDraftResponse> {
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
    id: string,
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
}
