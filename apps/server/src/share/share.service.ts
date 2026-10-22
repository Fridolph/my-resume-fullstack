import { randomBytes } from 'node:crypto'
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { PrismaService } from '../prisma/prisma.service'
import { ResumeService } from '../resume/resume.service'
import type { ShareCreateDto } from './dto/share-create.schema'
import { SHARE_MAX_DAYS, resolveShareExpiry } from './share.types'

/** 24 字节随机 → 32 字符 base64url。长度足够，且不含 URL 需要转义的字符 */
function createShareToken(): string {
  return randomBytes(24).toString('base64url')
}

export interface ShareLinkSummary {
  id: string
  token: string
  expiresAt: string
  revokedAt: string | null
  revokedReason: string | null
  label: string | null
  note: string | null
  allowAi: boolean
  allowPdf: boolean
  createdAt: string
}

/**
 * 分享链接：建链 / 撤销 / 公开读。
 *
 * ## 两层授权的叠加关系（不是替代）
 *
 * - `Resume.publishedAt` 回答"这份简历对外公开了吗"
 * - `ShareLink` 回答"**这一条链接**还能不能被读"
 *
 * 两者都要过：链接授权**不能**绕过"未发布不可读"。所以读路径先验链接、再走
 * `ResumeService.findPublished`（它自己也带 `publishedAt: { not: null }`）。
 *
 * ## 撤销是**物化**的
 *
 * `revokedAt` 一旦写入即永久失效，重新发布也不会复活 —— 否则"作者改一下再发"
 * 会让一条已经发出去的旧链接悄悄复活，那是更难解释的安全问题。
 */
@Injectable()
export class ShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeService: ResumeService,
  ) {}

  /** 建链。要求简历**属于本人且已发布** —— 未发布时建出来的链接也读不到，不如直接拒 */
  async create(resumeId: number, input: ShareCreateDto, user: AuthUser): Promise<ShareLinkSummary> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, workspaceUserId: user.userId, workspace: { user: { deletedAt: null } } },
      select: { id: true, publishedAt: true },
    })
    if (!resume) {
      throw new NotFoundException('简历不存在或不可访问', { errorCode: API_ERROR_CODES.RESUME_NOT_FOUND })
    }
    if (!resume.publishedAt) {
      throw new BadRequestException('请先发布该简历，再创建分享链接', {
        errorCode: API_ERROR_CODES.RESUME_NOT_PUBLISHED,
      })
    }

    const expiry = resolveShareExpiry(input.expiresIn, input.customDays)
    if (!expiry) {
      throw new BadRequestException(`有效期必须在 1 ~ ${SHARE_MAX_DAYS} 天之间`)
    }

    const link = await this.prisma.shareLink.create({
      data: {
        token: createShareToken(),
        resumeId,
        createdBy: user.userId,
        expiresAt: expiry.expiresAt,
        // 预留位：本轮只存不用，等 AI 上线再在鉴权处校验
        allowAi: input.allowAi ?? false,
        allowPdf: input.allowPdf ?? true,
        label: input.label ?? null,
        note: input.note ?? null,
      },
    })

    return toSummary(link)
  }

  /**
   * 撤销一条链接（幂等）。
   *
   * 校验 `resumeId` 也一并比对：否则知道别人 shareId 的人可以跨简历撤销。
   */
  async revoke(resumeId: number, shareId: string, user: AuthUser): Promise<{ id: string; revokedAt: string }> {
    const link = await this.prisma.shareLink.findFirst({
      where: {
        id: shareId,
        resumeId,
        resume: { workspaceUserId: user.userId, workspace: { user: { deletedAt: null } } },
      },
      select: { id: true, revokedAt: true },
    })
    if (!link) {
      throw new NotFoundException('分享链接不存在', { errorCode: API_ERROR_CODES.SHARE_NOT_FOUND })
    }
    if (link.revokedAt) {
      return { id: link.id, revokedAt: link.revokedAt.toISOString() }
    }

    const updated = await this.prisma.shareLink.update({
      where: { id: shareId },
      // 记录**为什么**撤销：admin 与访客提示都需要区分"作者主动撤销"与"取消发布导致"
      data: { revokedAt: new Date(), revokedReason: 'manual' },
      select: { id: true, revokedAt: true },
    })
    return { id: updated.id, revokedAt: updated.revokedAt?.toISOString() ?? '' }
  }

  /**
   * 校验 token 有效**且**该链接允许下载 PDF，返回 `resumeId`。
   *
   * 复用与 `readByToken` 同一套失效判定（顺序也一致），只是多了 `allowPdf` 这一道。
   */
  async assertPdfAllowed(token: string): Promise<{ resumeId: number }> {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      select: {
        resumeId: true,
        expiresAt: true,
        revokedAt: true,
        revokedReason: true,
        allowPdf: true,
        resume: {
          select: { publishedAt: true, workspace: { select: { user: { select: { deletedAt: true } } } } },
        },
      },
    })

    if (!link) {
      throw new NotFoundException('分享链接不存在', { errorCode: API_ERROR_CODES.SHARE_NOT_FOUND })
    }
    if (link.revokedAt) {
      throw link.revokedReason === 'unpublished'
        ? new NotFoundException('这份简历已不再公开', { errorCode: API_ERROR_CODES.SHARE_UNPUBLISHED })
        : new NotFoundException('这条分享链接已被撤销', { errorCode: API_ERROR_CODES.SHARE_REVOKED })
    }
    if (link.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('这条分享链接已过期', { errorCode: API_ERROR_CODES.SHARE_EXPIRED })
    }
    if (!link.resume.publishedAt || link.resume.workspace.user.deletedAt) {
      throw new NotFoundException('这份简历已不再公开', { errorCode: API_ERROR_CODES.SHARE_UNPUBLISHED })
    }
    if (!link.allowPdf) {
      throw new ForbiddenException('这条分享链接不允许下载 PDF', { errorCode: API_ERROR_CODES.SHARE_PDF_FORBIDDEN })
    }

    return { resumeId: link.resumeId }
  }

  /**
   * 公开读：解析 token → 拿草稿。
   *
   * **失效原因的判定顺序是有意的**：已撤销 > 已过期 > 未发布。
   * 撤销与过期都是链接自身的**永久/客观**状态，先说它们；"未发布"是作者的可变状态，
   * 放在最后 —— 否则作者重新发布后，同一条链接的提示会莫名其妙地变来变去。
   *
   * 这些码**只说明链接状态，不含简历内容**，所以不构成信息泄露。
   */
  async readByToken(token: string): Promise<{ draft: Awaited<ReturnType<ResumeService['findPublished']>> }> {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      select: {
        id: true,
        resumeId: true,
        expiresAt: true,
        revokedAt: true,
        revokedReason: true,
        resume: {
          select: { id: true, publishedAt: true, workspace: { select: { user: { select: { deletedAt: true } } } } },
        },
      },
    })

    if (!link) {
      throw new NotFoundException('分享链接不存在', { errorCode: API_ERROR_CODES.SHARE_NOT_FOUND })
    }
    // 撤销按**原因**给不同的码：因取消发布被批量撤销的，对访客该说"这份简历已不再公开"，
    // 而不是"作者撤销了链接" —— 后者会让访客以为作者只想挡住他一个人
    if (link.revokedAt) {
      throw link.revokedReason === 'unpublished'
        ? new NotFoundException('这份简历已不再公开', { errorCode: API_ERROR_CODES.SHARE_UNPUBLISHED })
        : new NotFoundException('这条分享链接已被撤销', { errorCode: API_ERROR_CODES.SHARE_REVOKED })
    }
    if (link.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('这条分享链接已过期', { errorCode: API_ERROR_CODES.SHARE_EXPIRED })
    }
    // 兜底：物化撤销已在上游覆盖，这里仍保留派生判断（旧数据 / 未来改策略时不至于放过）
    if (!link.resume.publishedAt || link.resume.workspace.user.deletedAt) {
      throw new NotFoundException('这份简历已不再公开', { errorCode: API_ERROR_CODES.SHARE_UNPUBLISHED })
    }

    // 记录最近访问时间。**不阻塞本次读取** —— 埋点是附带信息，不该影响主路径的延迟与可用性
    void this.prisma.shareLink
      .update({ where: { id: link.id }, data: { lastAccessAt: new Date() } })
      .catch(() => undefined)

    return { draft: await this.resumeService.findPublished(link.resumeId) }
  }
}

function toSummary(link: {
  id: string
  token: string
  expiresAt: Date
  revokedAt: Date | null
  revokedReason: string | null
  label: string | null
  note: string | null
  allowAi: boolean
  allowPdf: boolean
  createdAt: Date
}): ShareLinkSummary {
  return {
    id: link.id,
    token: link.token,
    expiresAt: link.expiresAt.toISOString(),
    revokedAt: link.revokedAt?.toISOString() ?? null,
    revokedReason: link.revokedReason,
    label: link.label,
    note: link.note,
    allowAi: link.allowAi,
    allowPdf: link.allowPdf,
    createdAt: link.createdAt.toISOString(),
  }
}
