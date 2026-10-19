import { Injectable } from '@nestjs/common'
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, pickAuditMetadata } from '@rs/common'
import type { Prisma } from '../generated/prisma/client'
import type { AuthUser } from '../common/http-context'
import { PrismaService } from '../prisma/prisma.service'
import type {
  AuditQuery,
  AuditRecordInput,
  ResumeCreationAudit,
  ResumeDeletionAudit,
  ResumeSetDefaultAudit,
  ResumeSetPublishedAudit,
  RoleChangeAudit,
  UserCreationAudit,
  UserDeletionAudit,
} from './audit.types'

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
   * 记录"删除简历"。
   *
   * 语义化方法的好处不在少写几行，而在**签名即契约**：
   * 快照字段必填 → 调用方必须先把删除前的信息读出来，想省掉这步就编译不过。
   */
  async recordResumeDeletion(
    transaction: Prisma.TransactionClient,
    actor: AuthUser,
    input: ResumeDeletionAudit,
  ): Promise<void> {
    await this.record(transaction, actor, {
      action: AUDIT_ACTIONS.resumeDelete,
      resourceType: AUDIT_RESOURCE_TYPES.resume,
      resourceId: String(input.resumeId),
      resourceSnapshot: { name: input.name },
      metadata: {
        revision: input.revision,
        sectionCount: input.sectionCount,
        wasDefault: input.wasDefault,
      },
      requestId: input.requestId,
    })
  }

  /** 记录"创建简历" */
  async recordResumeCreation(
    transaction: Prisma.TransactionClient,
    actor: AuthUser,
    input: ResumeCreationAudit,
  ): Promise<void> {
    await this.record(transaction, actor, {
      action: AUDIT_ACTIONS.resumeCreate,
      resourceType: AUDIT_RESOURCE_TYPES.resume,
      resourceId: String(input.resumeId),
      resourceSnapshot: { name: input.name },
      // `resume.create` 的白名单里只有 locale（见 packages/common/src/audit.ts）——
      // 名字走 resourceSnapshot 而不是 metadata，两者职责不同：
      // 前者是"这个资源当时长什么样"，后者是"这个动作的特有信息"
      metadata: { locale: input.locale },
      requestId: input.requestId,
    })
  }

  /** 记录"设为默认展示"。刻意记**被顶掉的那一份** —— 变更前的状态无法从当前数据反推 */
  async recordResumeSetDefault(
    transaction: Prisma.TransactionClient,
    actor: AuthUser,
    input: ResumeSetDefaultAudit,
  ): Promise<void> {
    await this.record(transaction, actor, {
      action: AUDIT_ACTIONS.resumeSetDefault,
      resourceType: AUDIT_RESOURCE_TYPES.resume,
      resourceId: String(input.resumeId),
      resourceSnapshot: { name: input.name },
      metadata: { previousDefaultId: input.previousDefaultId },
      requestId: input.requestId,
    })
  }

  /**
   * 记录「发布 / 取消发布」。
   *
   * 为什么它值得审计：这个动作改变的是**外人能看到什么** —— 与"删除"同一性质。
   * 一旦有人问「这份简历什么时候被公开的 / 谁把它撤下来的」，只有审计能回答：
   * 当前数据只有 `publishedAt`，而取消发布之后它就是 `null`。
   *
   * 取消发布若连带取消了默认展示，那次 `isDefault` 变化**不单独记一条** ——
   * 它由 `published: false` 这一条表达（是衍生结果，不是独立决定）。
   */
  async recordResumeSetPublished(
    transaction: Prisma.TransactionClient,
    actor: AuthUser,
    input: ResumeSetPublishedAudit,
  ): Promise<void> {
    await this.record(transaction, actor, {
      action: AUDIT_ACTIONS.resumeSetPublished,
      resourceType: AUDIT_RESOURCE_TYPES.resume,
      resourceId: String(input.resumeId),
      resourceSnapshot: { name: input.name },
      metadata: { published: input.published },
      requestId: input.requestId,
    })
  }

  /** 记录"创建账号"（准入动作，强一致） */
  async recordUserCreation(
    transaction: Prisma.TransactionClient,
    actor: AuthUser,
    input: UserCreationAudit,
  ): Promise<void> {
    await this.record(transaction, actor, {
      action: AUDIT_ACTIONS.userCreate,
      resourceType: AUDIT_RESOURCE_TYPES.user,
      resourceId: input.userId,
      resourceSnapshot: { nickname: input.nickname },
      // 创号时角色是入参、也是结果 —— 记"实际分配到的"而不是"请求里要的"，
      // 两者在角色被 seed 改写等情况下可能不同，审计要以落库的为准。
      metadata: { roleKeys: input.roleKeys },
      requestId: input.requestId,
    })
  }

  /** 记录"删除账号"（影响一个人能否访问系统，强一致） */
  async recordUserDeletion(
    transaction: Prisma.TransactionClient,
    actor: AuthUser,
    input: UserDeletionAudit,
  ): Promise<void> {
    await this.record(transaction, actor, {
      action: AUDIT_ACTIONS.userDelete,
      resourceType: AUDIT_RESOURCE_TYPES.user,
      resourceId: input.userId,
      resourceSnapshot: { nickname: input.nickname },
      metadata: { roleKeys: input.roleKeys },
      requestId: input.requestId,
    })
  }

  /**
   * 记录"角色变更"（责任最重：它改变"谁能做什么"）。
   *
   * ⚠️ **一次变更 = 一条审计**（Owner 2026-10-16 定）。
   * 若将来出现"批量授权 N 个用户"，调用方要为**每个受影响用户各调用一次**，
   * 而不是写一条带用户列表的聚合记录 —— 审计的查询入口是"某个用户的历史"，
   * 聚合记录会让单个人的历史查不到，正好废掉这条表的主索引。
   */
  async recordRoleChange(
    transaction: Prisma.TransactionClient,
    actor: AuthUser,
    input: RoleChangeAudit,
  ): Promise<void> {
    await this.record(transaction, actor, {
      action: AUDIT_ACTIONS.roleChange,
      resourceType: AUDIT_RESOURCE_TYPES.user,
      resourceId: input.userId,
      resourceSnapshot: { nickname: input.nickname },
      metadata: { before: input.before, after: input.after },
      requestId: input.requestId,
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
      ...(query.action ? { action: query.action } : {}),
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
