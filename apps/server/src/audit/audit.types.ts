import type { AuditAction, AuditResourceType } from '@rs/common'

/**
 * 审计模块的**类型面**：动作入参、请求上下文、查询条件。
 *
 * ## 为什么单独成文件
 *
 * 这些 interface 占 `audit.service.ts` 全文的 44%，而它们描述的是**契约形状**，
 * 服务描述的是**行为** —— 两件事混在一个文件里，读行为要翻过一屏类型，
 * 而调用方想确认"要传什么"也得先定位到 service 的方法签名。
 * 拆开之后：类型是给人消费的文档，service 是给运行时消费的实现。
 *
 * 编译期产物：interface 在运行时被完全擦除，所以这次搬移**不改变任何行为**，
 * 也无法引入行为缺陷 —— 验证只需"搬移前后同一组测试全绿"。
 *
 * ## 为什么不放 `dto/`
 *
 * `dto/*.schema.ts` 放的是 **HTTP 输入**：zod schema 与由它推导的类型**必须同文件**
 *（拆开就等于让"校验规则"和"类型"分家，两边迟早漂移）。
 *
 * 而这里的 `*Audit` 是**服务间契约** —— `AuditService` 方法的入参对象，
 * 由 `ResumeService` / `UserService` 在事务内构造，根本不经过 HTTP 层。
 * 把它们塞进 `dto/` 会让"dto = 请求边界"这条约定失效。
 *
 * 判据见 `AGENTS.md` §4.7。
 */

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
 *
 * 它是**跨模块**的入参（`ResumeService` / `UserService` 都接收它并往下传），
 * 所以放在类型文件里、由调用方从 `./audit.types` 引入，而不是从 service 里捞。
 */
export interface AuditContext {
  requestId?: string | null
}

/**
 * 删除简历时要记录的信息。
 *
 * ## 为什么把"三行 record 调用"收成语义化方法
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
