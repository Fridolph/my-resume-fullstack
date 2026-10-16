import { Injectable } from '@nestjs/common'
import { pickAuditMetadata, type AuditAction, type AuditResourceType } from '@rs/common'
import type { Prisma } from '../generated/prisma/client'
import type { AuthUser } from '../common/http-context'
import { PrismaService } from '../prisma/prisma.service'

/** 一条待写入的审计记录：除"操作者"外都由调用方给出 */
export interface AuditRecordInput {
  action: AuditAction
  resourceType: AuditResourceType
  resourceId: string
  /** 资源快照（如简历标题）—— 让人能读懂"操作的是哪一份"；**不得含 PII** */
  resourceSnapshot?: Record<string, unknown>
  /** 动作特有的少量信息；会经 `pickAuditMetadata` 白名单裁剪 */
  metadata?: Record<string, unknown>
  /** 关联请求日志的 id（来自 `req.traceId`），用于把审计行与那次请求串起来 */
  requestId?: string | null
}

/**
 * 审计写入所需的**请求级上下文**。
 *
 * 由 controller 显式传入（见 `common/decorators/trace-id.decorator.ts` 的说明）：
 * Service 手上只有 `AuthUser`，拿不到 `req.traceId`。
 */
export interface AuditContext {
  requestId?: string | null
}

/** 查询审计记录的条件（超管专用） */
export interface AuditQuery {
  actorId?: string
  resourceType?: AuditResourceType
  resourceId?: string
  /** 起始时间（含） */
  from?: Date
  /** 结束时间（含） */
  to?: Date
  page?: number
  pageSize?: number
}

/**
 * 审计读写。
 *
 * ## 边界：它**不判断"谁可以做"**
 *
 * 授权（谁能删简历、谁可以查审计）是 Guard / 权限键的事，这里只负责
 * "怎么写、怎么读"。这条边界让同一个服务能被不同入口复用，
 * 也让"加一个新动作要不要开权限"这种问题不必改到这里来。
 *
 * ## 写在内、读在外（本服务最重要的结构）
 *
 * - `record()` **必须接收调用方的事务客户端**（`transaction`），这样审计行与业务变更
 *   落在**同一个事务**里：业务回滚，审计一起消失；审计写失败，业务一起回滚。
 *   这是"强一致"的实现方式，而不是靠"业务成功后再补一条"。
 * - `list()` 走自己的 `PrismaService`（只读，不参与业务事务）。
 *
 * ⚠️ 类型上无法完全阻止"传非事务客户端进来"（`PrismaService` 结构上兼容 `TransactionClient`），
 * 所以这条靠**调用约定**保证；集成测试会断言"业务失败时审计行也不存在"来兜住它。
 */
@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 在**给定事务内**写入一条审计记录。
   *
   * @param transaction 调用方的业务事务客户端（**不要传 `this.prismaService`**）
   * @param actor 已通过 Guard 验证的操作者 —— ⚠️ 必须来自 `req.user`，
   *   **绝不能**从请求体里取 `userId`（那是客户端可伪造的输入）
   * @param input 动作、资源与可选快照
   */
  async record(transaction: Prisma.TransactionClient, actor: AuthUser, input: AuditRecordInput): Promise<void> {
    await transaction.auditLog.create({
      data: {
        actorId: actor.userId,
        // 只存昵称：`User` 是软删除，actorId 始终能 join 回账号拿到邮箱等信息，
        // 快照只需保住"最容易变、且账号真被清掉后 join 不到"的展示名。
        // 存邮箱属于冗余采集，与"审计不写多余 PII"冲突。
        actorSnapshot: { nickname: actor.nickname },
        // 角色必须在**写入时刻**快照：角色会变，事后靠 join 当前角色表反推会失真
        actorRoleKeys: actor.roleKeys,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        resourceSnapshot: input.resourceSnapshot as Prisma.InputJsonValue | undefined,
        requestId: input.requestId ?? null,
        // 唯一强制执行点：白名单之外一律丢弃；全被裁掉时落 NULL 而不是 {}
        metadata: pickAuditMetadata(input.action, input.metadata) as Prisma.InputJsonValue | undefined,
      },
    })
  }

  /**
   * 分页查询审计记录（新 → 旧）。
   *
   * 返回 `total` 是因为审计页面必然要显示"共 N 条"并翻页；
   * 分页参数在这里收口（`page` 从 1 起、`pageSize` 有上限），
   * 避免每个调用方各写一套边界处理。
   */
  async list(query: AuditQuery): Promise<{ items: unknown[]; total: number }> {
    const page = Math.max(1, Math.trunc(query.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 20)))

    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.resourceId ? { resourceId: query.resourceId } : {}),
      ...(query.from || query.to
        ? { occurredAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
    }

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.auditLog.count({ where }),
    ])

    return { items, total }
  }
}
