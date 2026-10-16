import assert from 'node:assert/strict'
import { test } from 'vitest'
import { AuditController } from '../audit.controller'
import type { AuditService } from '../audit.service'
import type { AuthUser } from '../../common/http-context'
import { PERMISSION_KEYS } from '../../auth/permission-keys'

/** 只实现 `list`；调用记录用于断言"未授权时**根本没查库**" */
function createController() {
  const listCalls: unknown[] = []
  const service = {
    list: async (query: unknown) => {
      listCalls.push(query)
      return { items: [{ id: 'a-1' }], total: 1 }
    },
  }
  return { controller: new AuditController(service as unknown as AuditService), listCalls }
}

function actor(overrides: Partial<AuthUser>): AuthUser {
  return {
    userId: 'u-1',
    email: null,
    nickname: '某人',
    sessionVersion: 1,
    roleKeys: [],
    permissionKeys: [],
    ...overrides,
  }
}

test('仅超管：admin 角色即使被授予该权限，也不放行', async () => {
  const { controller, listCalls } = createController()
  const adminWithPermission = actor({
    roleKeys: ['admin'],
    permissionKeys: [PERMISSION_KEYS.AUDIT_LOG_VIEW],
  })

  await assert.rejects(
    controller.list(adminWithPermission, {}),
    (error: unknown) => (error as { getStatus(): number }).getStatus() === 403,
  )
  assert.equal(listCalls.length, 0, '未授权时**不该查库** —— 否则 403/404 差异可被用来探测')
})

test('仅超管：超管但缺明确权限时，同样不放行（双判定）', async () => {
  const { controller, listCalls } = createController()
  const superAdminWithoutPermission = actor({ roleKeys: ['super_admin'], permissionKeys: [] })

  await assert.rejects(
    controller.list(superAdminWithoutPermission, {}),
    (error: unknown) => (error as { getStatus(): number }).getStatus() === 403,
  )
  assert.equal(listCalls.length, 0)
})

test('超管 + 明确权限：放行并把查询条件透传给 service', async () => {
  const { controller, listCalls } = createController()
  const viewer = actor({
    roleKeys: ['super_admin'],
    permissionKeys: [PERMISSION_KEYS.AUDIT_LOG_VIEW],
  })

  const result = await controller.list(viewer, { resourceType: 'resume', resourceId: '42', page: 2, pageSize: 10 })

  assert.equal(listCalls.length, 1)
  assert.deepEqual(listCalls[0], {
    actorId: undefined,
    resourceType: 'resume',
    resourceId: '42',
    from: undefined,
    to: undefined,
    page: 2,
    pageSize: 10,
  })
  // 回显分页参数用**实际生效的默认值**（缺省 1 / 20），便于前端直接渲染
  assert.deepEqual(result, { items: [{ id: 'a-1' }], total: 1, page: 2, pageSize: 10 })
})

test('未传分页参数时回显默认 1 / 20', async () => {
  const { controller } = createController()
  const viewer = actor({ roleKeys: ['super_admin'], permissionKeys: [PERMISSION_KEYS.AUDIT_LOG_VIEW] })

  const result = await controller.list(viewer, {})

  assert.equal((result as { page: number }).page, 1)
  assert.equal((result as { pageSize: number }).pageSize, 20)
})
