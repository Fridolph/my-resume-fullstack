import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  canonicalResumeJson,
  pdfConfigReferencesValid,
  resumeDocumentSchema,
  resumePdfConfigSchema,
  toResumePdfPreset,
  type ResumePdfConfigResponse,
  type ResumePdfConfigUpdateDto,
} from '@rs/common'
import { Prisma } from '../generated/prisma/client'
import type { AuthUser } from '../common/http-context'
import { PrismaService } from '../prisma/prisma.service'

/** 本人纸面配置与公共预设持久化；模块内容仍留在唯一简历文档内。 */
@Injectable()
export class ResumePdfConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** 权限在访问数据库之前判断；所有权始终使用 Guard 恢复的身份。 */
  private assertEditable(user: AuthUser): void {
    if (!user.permissionKeys.includes('Resume.Display:edit')) throw new ForbiddenException('当前身份不能修改 PDF 配置')
  }

  /** 公共预设只读本人工作区；未配置返回 null，由客户端显示系统默认。 */
  async getPreset(user: AuthUser): Promise<ResumePdfConfigResponse> {
    const workspace = await this.prisma.resumeWorkspace.findUnique({ where: { userId: user.userId } })
    return { config: workspace?.pdfConfig ? resumePdfConfigSchema.parse(workspace.pdfConfig) : null }
  }

  /**
   * expectedConfig 是配置自身的乐观锁，避免后写者静默覆盖。
   * 公共预设剔除实例 ID；更新不触碰任何简历，首次保存也不需要 seed。
   */
  async savePreset(input: ResumePdfConfigUpdateDto, user: AuthUser): Promise<ResumePdfConfigResponse> {
    this.assertEditable(user)
    const config = toResumePdfPreset(input.config)
    return this.prisma.$transaction(async tx => {
      await tx.resumeWorkspace.upsert({ where: { userId: user.userId }, create: { userId: user.userId }, update: {} })
      const result = await tx.resumeWorkspace.updateMany({
        where: {
          userId: user.userId,
          pdfConfig: input.expectedConfig === null ? { equals: Prisma.DbNull } : { equals: input.expectedConfig },
        },
        data: { pdfConfig: config as Prisma.InputJsonValue },
      })
      if (!result.count) throw new ConflictException('公共预设已被其他窗口修改，请重新读取')
      return { config }
    })
  }

  /** 本人草稿配置；他人、不存在与已删除统一 404，不泄漏是否存在。 */
  async getConfig(id: number, user: AuthUser): Promise<ResumePdfConfigResponse> {
    const draft = await this.prisma.resumeDraft.findFirst({
      where: { resume: { id, workspaceUserId: user.userId, workspace: { user: { deletedAt: null } } } },
    })
    if (!draft) throw new NotFoundException('简历不存在或不可访问')
    return { config: resumeDocumentSchema.parse(draft.document).display.pdf ?? null }
  }

  /**
   * 比较配置再以完整 JSON 作为 CAS 条件写回：正文/网页配置并发变化则返回409，
   * 不能把刚读到的旧正文覆盖回库。只修改 pdf，不推进正文 revision。
   */
  async saveConfig(id: number, input: ResumePdfConfigUpdateDto, user: AuthUser): Promise<ResumePdfConfigResponse> {
    this.assertEditable(user)
    return this.prisma.$transaction(async tx => {
      const draft = await tx.resumeDraft.findFirst({
        where: { resume: { id, workspaceUserId: user.userId, workspace: { user: { deletedAt: null } } } },
      })
      if (!draft) throw new NotFoundException('简历不存在或不可访问')
      const document = resumeDocumentSchema.parse(draft.document)
      if (canonicalResumeJson(document.display.pdf ?? null) !== canonicalResumeJson(input.expectedConfig))
        throw new ConflictException('PDF 配置已被其他窗口修改，请重新读取')
      if (
        !pdfConfigReferencesValid(
          input.config,
          document.content.sections.map(section => section.id),
        )
      )
        throw new BadRequestException('PDF 配置引用了不存在的模块，请刷新内容')
      const next = resumeDocumentSchema.parse({ ...document, display: { ...document.display, pdf: input.config } })
      const result = await tx.resumeDraft.updateMany({
        where: { id: draft.id, document: { equals: draft.document as Prisma.InputJsonValue } },
        data: { document: next as Prisma.InputJsonValue, updatedBy: user.userId },
      })
      if (!result.count) throw new ConflictException('简历已变化，请重新读取后保存配置')
      return { config: input.config }
    })
  }
}
