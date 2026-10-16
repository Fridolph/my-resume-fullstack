import { Injectable } from '@nestjs/common'
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCE_TYPES,
  pickAuditMetadata,
  type AuditAction,
  type AuditResourceType,
} from '@rs/common'
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

/**
 * 删除简历时要记录的信息。
 *
 * ## 为什么把"三行 record 调用"收成这个方法
 *
 * 不是为了少写几行，而是**把"必须提供的快照"变成类型要求**：
 * `name` / `wasDefault` 是必填字段 —— 漏了编译不过。
 * 之前靠自觉传 `metadata`，最坏情况是"审计写了，但没有可判断的信息"，而这种缺失**不报错**。
 *
 * 快照全部取自**删除之前**的读取结果（见 `ResumeService.remove` 的执行顺序）。
 */
export interface ResumeDeletionAudit {
  resumeId: number
  /** 删除**之前**的简历名 */
  name: string
  /** 删除前的草稿版本号；没有草稿时为 undefined */
  revision?: number
  /** 删除前的模块数；读不到文档时为 undefined */
  sectionCount?: number
  /** 删除前是否为「默认展示」 */
  wasDefault: boolean
  requestId?: string | null
}

/**
 * 创建简历时要记录的信息。
 *
 * `name` 必填的理由与删除一致：**快照要在能取到的时候取**。
 * 创建时取名字的代价为零（本来就在入参里），但若此刻不取，
 * 将来"这份简历最初叫什么"就无从得知（改名不留痕）。
 */
export interface ResumeCreationAudit {
  resumeId: number
  name: string
  locale: string
  requestId?: string | null
}

/** 设为默认展示时要记录的信息 */
export interface ResumeSetDefaultAudit {
  resumeId: number
  name: string
  /** **被顶掉的那一份**（原来设为默认的简历 id）；之前没有默认时为 undefined */
  previousDefaultId?: number
  requestId?: string | null
}

/**
 * 账号与权限域三个动作的审计入参。
 *
 * ## 为什么这三个动作的 `resourceId` 都是"**被操作的那个用户**"
 *
 * Owner 2026-10-16 定的方案 A：审计记录的主体是**人**，不是配置。
 * 追责时最自然的问题是"**用户 X 的权限被谁在什么时候改过**" ——
 * 把 `resourceId` 指向被授权者，一次 `(resourceType, resourceId, occurredAt)` 查询就能回答它。
 * `actorId` 仍然指向操作者，两者是两个不同的人，不要混。
 *
 * ## 为什么 `nickname` 必填
 *
 * `User` 是软删除，`resourceId` 现在还能 join 回账号；但审计行必须**自包含** ——
 * 将来账号真被物理清理后（GDPR 式的删除请求），这张表仍要能读懂"当时改的是谁"。
 * 与 `actorSnapshot` 只存昵称同一口径：快照不冗余采集 PII（邮箱 / 手机号）。
 */
export interface UserCreationAudit {
  /** 新建用户的 id */
  userId: string
  /** 展示名（可能为 null —— 创号时昵称本来就是可选的） */
  nickname: string | null
  /** 创号时实际分配到的角色键 */
  roleKeys: string[]
  requestId?: string | null
}

/** 删除账号时要记录的信息；`roleKeys` 是**删除之前**的角色集合 */
export interface UserDeletionAudit {
  userId: string
  nickname: string | null
  roleKeys: string[]
  requestId?: string | null
}

/**
 * 角色 / 权限变更时要记录的信息。
 *
 * `before` / `after` 记的是**角色键集合**，而不是权限键集合。
 *
 * 理由：角色键是**稳定标识**，而"某个角色当时拥有哪些权限"会随
 * `ROLE_PERMISSION_PRESETS` 调整而变化。把权限集合写进审计，
 * 记下的是**当时的定义**、不是当时的实际能力，事后读反而误导。
 *
 * 两端都记完整集合（而非只记增删）：追责常需要"变更后到底拥有什么"，
 * 只记 diff 会把完整态留在历史的别处，读一条记录还原不出来。
 */
export interface RoleChangeAudit {
  /** **被授权者**的 id（方案 A：资源是人） */
  userId: string
  nickname: string | null
  /** 变更前的角色键集合（已排序去重） */
  before: string[]
  /** 变更后的角色键集合（已排序去重） */
  after: string[]
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
