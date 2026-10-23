import { randomBytes } from 'node:crypto'
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { PagedResult } from '@rs/common'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '../generated/prisma/client'
import { ResumeService } from '../resume/resume.service'
import { PostgresShareEventSink } from './share-event.sink'
import type { ShareLinkDetail, ShareLinkListItem, ShareVisitorContext } from './share.types'
import type { ShareCreateDto } from './dto/share-create.schema'
import type { ShareListQueryDto } from './dto/share-list.schema'
import type { ShareUpdateDto } from './dto/share-update.schema'
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
  /** `null` = 不开放 AI */
  aiQuota: number | null
  aiUsed: number
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
    /** 事件出口。业务代码只认 `ShareEventSink` 接口，换实现不动这里 */
    private readonly events: PostgresShareEventSink,
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
        // AI 配额挂在**链接**上（Owner 2026-10-22）：`shareId` 是 AI 能力的唯一读取标识，
        // 按简历或用户计数会把多条链接的用量混在一起
        aiQuota: input.aiQuota ?? null,
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
  async assertPdfAllowed(token: string): Promise<{ shareId: string; resumeId: number }> {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      select: {
        id: true,
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

    return { shareId: link.id, resumeId: link.resumeId }
  }

  /**
   * 记录"访客按链接下载了 PDF"。
   *
   * fire-and-forget：埋点失败只 warn（在 sink 里吞），**绝不能让记录失败导致下载失败**。
   */
  recordPdfDownload(shareId: string, visitor: ShareVisitorContext = {}): void {
    void this.events.record({ shareId, type: 'pdfDownloaded', pagePath: '/share', ...visitor })
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
  async readByToken(
    token: string,
    visitor: ShareVisitorContext = {},
  ): Promise<{ draft: Awaited<ReturnType<ResumeService['findPublished']>> }> {
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

    const draft = await this.resumeService.findPublished(link.resumeId)

    // 记录浏览。**用文档里的 `revision`**：它能回答"改完这一版之后还有没有人看"
    void this.events.record({
      shareId: link.id,
      type: 'linkViewed',
      revision: draft.revision,
      pagePath: '/share',
      ...visitor,
    })

    return { draft }
  }

  // ── 发布管理页（R4）──────────────────────────────────────────────────
  //
  // 这些方法都只返回**本人**的链接（`resume.workspaceUserId`）。管理页与简历列表
  // 用同一套归属口径：别人的链接不是"被过滤掉"，而是**根本查不到** —— 越权语义一致。

  /**
   * 本人的分享链接列表。
   *
   * 状态筛选的 where **必须覆盖全集**（有效 / 过期 / 已撤销），否则管理页会出现
   * "三档都查不到"的链接 —— 那种情况最容易被当成数据丢了。
   */
  async listOwned(query: ShareListQueryDto, user: AuthUser): Promise<PagedResult<ShareLinkListItem>> {
    const now = new Date()
    const statusWhere: Prisma.ShareLinkWhereInput =
      query.status === 'active'
        ? { revokedAt: null, expiresAt: { gt: now } }
        : query.status === 'expired'
          ? { revokedAt: null, expiresAt: { lte: now } }
          : query.status === 'revoked'
            ? { revokedAt: { not: null } }
            : {}

    const where: Prisma.ShareLinkWhereInput = {
      ...statusWhere,
      ...(query.resumeId === undefined ? {} : { resumeId: query.resumeId }),
      resume: { workspaceUserId: user.userId, workspace: { user: { deletedAt: null } } },
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.shareLink.count({ where }),
      this.prisma.shareLink.findMany({
        where,
        // 新建的排前面：管理页的第一诉求是"我刚发的那条"
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { resume: { select: { name: true, publishedAt: true } } },
      }),
    ])

    return {
      items: rows.map(row => toListItem(row, now)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  /**
   * 单条链接的详情：元信息 + **事件统计**。
   *
   * 统计用 `groupBy` 而不是把事件全捞回来数：一条热门链接可能有上万条事件，
   * 而管理页只需要"看了几次、下了几次"。
   */
  async getOwnedDetail(shareId: string, user: AuthUser): Promise<ShareLinkDetail> {
    const row = await this.findOwned(shareId, user)

    const grouped = await this.prisma.shareEvent.groupBy({
      by: ['name'],
      where: { shareId },
      _count: { _all: true },
    })

    const recent = await this.prisma.shareEvent.findMany({
      where: { shareId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
      select: { name: true, action: true, revision: true, createdAt: true },
    })

    return {
      ...toListItem(row, new Date()),
      stats: grouped.map(group => ({ name: group.name, count: group._count._all })).sort((a, b) => b.count - a.count),
      totalEvents: grouped.reduce((sum, group) => sum + group._count._all, 0),
      recentEvents: recent.map(event => ({
        name: event.name,
        action: event.action,
        revision: event.revision,
        createdAt: event.createdAt.toISOString(),
      })),
    }
  }

  /**
   * 改元信息（`label` / `note`）。
   *
   * 只允许这两项 —— `token` / `expiresAt` / `allowPdf` 是授权语义的一部分，
   * 改它们等于换了一条链接，那应当是"新建 + 撤销旧的"（见 DTO 注释）。
   */
  async updateOwnedMeta(shareId: string, input: ShareUpdateDto, user: AuthUser): Promise<ShareLinkSummary> {
    await this.findOwned(shareId, user)

    const updated = await this.prisma.shareLink.update({
      where: { id: shareId },
      data: {
        ...(input.label === undefined ? {} : { label: input.label }),
        ...(input.note === undefined ? {} : { note: input.note }),
      },
    })

    return toSummary(updated)
  }

  /**
   * 按链接 id 撤销（管理页用）。
   *
   * 与 `revoke(resumeId, shareId)` 的区别只是**入口形状**：管理页拿到的是链接 id，
   * 不该为了撤销再知道它属于哪份简历。归属校验仍然照做。
   */
  async revokeOwnedById(shareId: string, user: AuthUser): Promise<{ id: string; revokedAt: string }> {
    const row = await this.findOwned(shareId, user)
    if (row.revokedAt) {
      return { id: row.id, revokedAt: row.revokedAt.toISOString() }
    }

    const updated = await this.prisma.shareLink.update({
      where: { id: shareId },
      data: { revokedAt: new Date(), revokedReason: 'manual' },
      select: { id: true, revokedAt: true },
    })

    return { id: updated.id, revokedAt: updated.revokedAt?.toISOString() ?? '' }
  }

  /**
   * 取一条**属于本人**的链接，否则 404。
   *
   * 不区分"不存在"与"不是你的"：区分了就等于告诉对方"这个 id 存在"。
   */
  private async findOwned(shareId: string, user: AuthUser) {
    const row = await this.prisma.shareLink.findFirst({
      where: { id: shareId, resume: { workspaceUserId: user.userId, workspace: { user: { deletedAt: null } } } },
      include: { resume: { select: { name: true, publishedAt: true } } },
    })

    if (!row) {
      throw new NotFoundException('分享链接不存在', { errorCode: API_ERROR_CODES.SHARE_NOT_FOUND })
    }

    return row
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
  /** `null` = 不开放 AI */
  aiQuota: number | null
  aiUsed: number
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
    aiQuota: link.aiQuota,
    aiUsed: link.aiUsed,
    allowPdf: link.allowPdf,
    createdAt: link.createdAt.toISOString(),
  }
}

/**
 * 列表行：把库里的行转成管理页要的形状。
 *
 * `status` / `expiresInDays` **在服务端算**，不让前端各写一套判断 ——
 * "已撤销优先于已过期"这条顺序只要有一处写反，管理页就会把撤销的链接显示成"已过期"。
 */
function toListItem(
  link: {
    id: string
    token: string
    resumeId: number
    expiresAt: Date
    revokedAt: Date | null
    revokedReason: string | null
    label: string | null
    note: string | null
    /** `null` = 不开放 AI */
    aiQuota: number | null
    aiUsed: number
    allowPdf: boolean
    createdAt: Date
    lastAccessAt: Date | null
    resume: { name: string; publishedAt: Date | null }
  },
  now: Date,
): ShareLinkListItem {
  const revoked = link.revokedAt !== null
  const expired = link.expiresAt.getTime() <= now.getTime()

  return {
    id: link.id,
    token: link.token,
    resumeId: link.resumeId,
    resumeName: link.resume.name,
    resumePublished: link.resume.publishedAt !== null,
    expiresAt: link.expiresAt.toISOString(),
    revokedAt: link.revokedAt?.toISOString() ?? null,
    revokedReason: link.revokedReason,
    label: link.label,
    note: link.note,
    aiQuota: link.aiQuota,
    aiUsed: link.aiUsed,
    allowPdf: link.allowPdf,
    createdAt: link.createdAt.toISOString(),
    lastAccessAt: link.lastAccessAt?.toISOString() ?? null,
    // 撤销优先：一条既撤销又过期的链接，管理员该看到"已撤销"（那是有人主动做的事）
    status: revoked ? 'revoked' : expired ? 'expired' : 'active',
    expiresInDays: revoked ? null : Math.ceil((link.expiresAt.getTime() - now.getTime()) / 86_400_000),
  }
}
