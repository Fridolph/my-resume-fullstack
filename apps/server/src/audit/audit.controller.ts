import { Controller, ForbiddenException, Get, Query } from '@nestjs/common'
import { PERMISSION_KEYS } from '../auth/permission-keys'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { API_ERROR_CODES } from '../common/error-codes'
import type { AuthUser } from '../common/http-context'
import { AuditService } from './audit.service'
import { auditQuerySchema, type AuditQueryDto } from './dto/audit-query.schema'

/**
 * 审计查阅接口（**仅超管**）。
 *
 * ## 为什么这是"另一个域"的接口
 *
 * 审计的**读**完全独立于业务线：独立模块、独立权限键（`Audit.Log:view`）、
 * 不复用 `Resume.*` / `Settings.Users:*` 任何一个键。
 * 理由（Owner 2026-10-16）：让超管专门承担查阅职责，避免权限散落在各业务域里
 * —— 否则"谁能看审计"会随各域权限调整而意外扩张。
 *
 * ## 为什么授权写在这里、而不是 `AuditService`
 *
 * `AuditService` 的边界是"怎么写、怎么读"，**不判断谁可以做**（见其类注释）。
 * 授权属于入口层：放这里，同一份读写能力还能被内部任务复用而不夹带 HTTP 语义。
 *
 * ⚠️ **角色与权限双判定**（与 `UserService.update` 同口径）：
 * 只看角色会漏掉"角色被改但权限没同步"的情形；只看权限则失去"必须是超管"这条更强的约束。
 */
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(@CurrentUser() currentUser: AuthUser, @Query({ schema: auditQuerySchema }) query: AuditQueryDto) {
    this.assertAuditViewer(currentUser)

    const { items, total } = await this.auditService.list({
      actorId: query.actorId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      action: query.action,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    })

    return { items, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  /**
   * 查阅审计要求**超管角色 + 明确权限**，两者缺一不可。
   *
   * 先授权、再查询（不先查再判）：避免未授权调用通过 404/403 的差异
   * 探测"某个资源是否存在过"。
   */
  private assertAuditViewer(currentUser: AuthUser): void {
    const isSuperAdmin = currentUser.roleKeys.includes('super_admin')
    const hasViewPermission = currentUser.permissionKeys.includes(PERMISSION_KEYS.AUDIT_LOG_VIEW)

    if (!isSuperAdmin || !hasViewPermission) {
      throw new ForbiddenException('只有超级管理员可以查阅审计记录', {
        errorCode: API_ERROR_CODES.AUDIT_VIEW_FORBIDDEN,
      })
    }
  }
}
