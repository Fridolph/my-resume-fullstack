import assert from 'node:assert/strict'
import { test } from 'vitest'
import { UserService } from '../user.service'
import type { AuthUser } from '../../common/http-context'
import type { ChangeUserRolesDto, CreateUserDto } from '../dto/user.schema'

/**
 * 账号与权限域的三个写动作（Issue #56）的**接线**验证。
 *
 * 这里注入的是「极简 fake Prisma」：只实现被调用到的方法，`$transaction` 直接把
 * 调用方给的回调跑起来。**不连数据库**，所以它证明的是接线与顺序，不是数据库语义 ——
 * 后者由 `apps/server/src/audit/__tests__/audit.integration.test.ts`（真库）负责。
 *
 * 断言里最要紧的一条是**同一个事务句柄**：`auditCalls[i].transaction === transaction`。
 * 若有人把审计改到事务外面去写（"业务成功后再补一条"），这条会立刻红 ——
 * 那正是"权限改了却没人知道是谁改的"的成因。
 */
type PrismaServiceDouble = ConstructorParameters<typeof UserService>[0]
type AuditServiceDouble = ConstructorParameters<typeof UserService>[1]

const superAdmin: AuthUser = {
  userId: 'u-root',
  email: 'root@example.com',
  nickname: 'root',
  sessionVersion: 1,
  roleKeys: ['super_admin'],
  permissionKeys: ['Settings.Users:edit', 'Settings.Users:delete'],
}

/** 只有编辑权限、没有删除权限的身份，用于验证"每个动作各查各的权限" */
const editorOnly: AuthUser = { ...superAdmin, permissionKeys: ['Settings.Users:edit'] }

interface AuditCall {
  method: string
  transaction: unknown
  actor: AuthUser
  input: Record<string, unknown>
}

/** 构造替身：`$transaction` 同步执行回调，于是"写在内"可以用对象同一性验证 */
function createService(options: { tx: Record<string, unknown>; role?: unknown; onAudit?: () => void }) {
  const auditCalls: AuditCall[] = []
  const record =
    (method: string) =>
    async (...args: unknown[]) => {
      options.onAudit?.()
      auditCalls.push({
        method,
        transaction: args[0],
        actor: args[1] as AuthUser,
        input: args[2] as Record<string, unknown>,
      })
    }

  const auditService = {
    recordUserCreation: record('recordUserCreation'),
    recordUserDeletion: record('recordUserDeletion'),
    recordRoleChange: record('recordRoleChange'),
  }

  const transaction = options.tx
  const prismaService = {
    role: { findUnique: async () => options.role ?? null },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(transaction),
  }

  const service = new UserService(
    prismaService as unknown as PrismaServiceDouble,
    auditService as unknown as AuditServiceDouble,
  )

  return { service, auditCalls, transaction }
}

const createdUserRow = {
  id: 'u-new',
  username: 'lifeiyu',
  nickname: '厉飞雨',
  email: null,
  avatar: null,
  roles: [{ role: { id: 'r-admin', key: 'admin', name: '管理员' } }],
  createdAt: new Date('2026-10-16T00:00:00Z'),
  updatedAt: new Date('2026-10-16T00:00:00Z'),
}

test('create：审计写进**业务事务**，快照与 actor 都取自服务端上下文', async () => {
  const { service, auditCalls, transaction } = createService({
    role: { id: 'r-admin' },
    tx: { user: { create: async () => createdUserRow } },
  })

  await service.create({ password: 'pw123456', roleKey: 'admin' } as CreateUserDto, superAdmin, { requestId: 'req-1' })

  assert.equal(auditCalls.length, 1)
  const call = auditCalls[0] as AuditCall
  assert.equal(call.method, 'recordUserCreation')
  assert.equal(call.transaction, transaction, '必须是调用方给的那个事务句柄，不能另开一个连接')
  assert.equal(call.actor, superAdmin, '操作者只能来自 req.user')
  assert.deepEqual(call.input, {
    userId: 'u-new',
    nickname: '厉飞雨',
    // 记的是**落库后实际拥有**的角色，而不是请求里的 roleKey
    roleKeys: ['admin'],
    requestId: 'req-1',
  })
})

test('create：业务写入失败时不写审计（顺序即保证）', async () => {
  const { service, auditCalls } = createService({
    role: { id: 'r-admin' },
    tx: {
      user: {
        create: async () => {
          throw new Error('Unique constraint failed on the fields: (`username`)')
        },
      },
    },
  })

  await assert.rejects(
    service.create({ password: 'pw123456', roleKey: 'admin' } as CreateUserDto, superAdmin),
    /Unique constraint/,
  )
  assert.equal(auditCalls.length, 0, '账号没建成，就不该留下"创建过"的记录')
})

test('create：角色未初始化时给 400，且根本不进事务', async () => {
  let transactionOpened = false
  const auditCalls: unknown[] = []
  const prismaService = {
    role: { findUnique: async () => null },
    $transaction: async () => {
      transactionOpened = true
      return undefined
    },
  }
  const auditService = {
    recordUserCreation: async () => {
      auditCalls.push('recordUserCreation')
    },
  }
  const service = new UserService(
    prismaService as unknown as PrismaServiceDouble,
    auditService as unknown as AuditServiceDouble,
  )

  await assert.rejects(
    service.create({ password: 'pw123456', roleKey: 'admin' } as CreateUserDto, superAdmin),
    error => (error as { getStatus(): number }).getStatus() === 400,
  )
  assert.equal(transactionOpened, false, '角色都没找到，不该开事务')
  assert.equal(auditCalls.length, 0)
})

test('remove：先改状态、后写审计，快照取自删除前', async () => {
  const order: string[] = []
  const { service, auditCalls } = createService({
    onAudit: () => order.push('audit'),
    tx: {
      user: {
        findFirst: async () => ({ id: 'u-9', nickname: '韩立', roles: [{ role: { key: 'user' } }] }),
        updateMany: async () => {
          order.push('updateMany')
          return { count: 1 }
        },
      },
    },
  })

  const result = await service.remove('u-9', superAdmin, { requestId: 'req-2' })

  assert.ok(result.deletedAt instanceof Date)
  // 顺序有实际含义：审计里的角色集合是"删除前的"，而状态必须先真正改成功
  assert.deepEqual(order, ['updateMany', 'audit'])
  assert.equal(auditCalls.length, 1)
  assert.deepEqual(auditCalls[0]?.input, {
    userId: 'u-9',
    nickname: '韩立',
    roleKeys: ['user'],
    requestId: 'req-2',
  })
})

test('remove：条件更新未命中（并发状态变化）时抛 409，且不写审计', async () => {
  const { service, auditCalls } = createService({
    tx: {
      user: {
        findFirst: async () => ({ id: 'u-9', nickname: '韩立', roles: [{ role: { key: 'user' } }] }),
        updateMany: async () => ({ count: 0 }),
      },
    },
  })

  await assert.rejects(
    service.remove('u-9', superAdmin),
    error => (error as { getStatus(): number }).getStatus() === 409,
  )
  assert.equal(auditCalls.length, 0, '什么都没删掉，就不该留下"删除过"的记录')
})

test('remove：目标是超管时拒绝，且不写审计', async () => {
  const { service, auditCalls } = createService({
    tx: {
      user: {
        findFirst: async () => ({ id: 'u-9', nickname: 'root2', roles: [{ role: { key: 'super_admin' } }] }),
        updateMany: async () => ({ count: 1 }),
      },
    },
  })

  await assert.rejects(
    service.remove('u-9', superAdmin),
    error => (error as { getStatus(): number }).getStatus() === 403,
  )
  assert.equal(auditCalls.length, 0)
})

test('remove：没有删除权限时在事务之前就拒绝', async () => {
  const { service, auditCalls } = createService({ tx: {} })

  await assert.rejects(
    service.remove('u-9', editorOnly),
    error => (error as { getStatus(): number }).getStatus() === 403,
  )
  assert.equal(auditCalls.length, 0)
})

test('changeRoles：重写角色关联并记录 before / after', async () => {
  let created: unknown
  const { service, auditCalls, transaction } = createService({
    tx: {
      // changeRoles 会先 `SELECT … FOR UPDATE` 锁目标行；替身只需让这一句可调用
      $queryRaw: async () => [],
      user: {
        findFirst: async () => ({
          id: 'u-9',
          nickname: '韩立',
          roles: [{ role: { id: 1, key: 'user' } }],
        }),
      },
      role: { findMany: async () => [{ id: 2, key: 'admin' }] },
      userRole: {
        deleteMany: async () => ({ count: 1 }),
        createMany: async (args: unknown) => {
          created = args
          return { count: 1 }
        },
      },
    },
  })

  const result = await service.changeRoles('u-9', { roleKeys: ['admin'] } as ChangeUserRolesDto, superAdmin, {
    requestId: 'req-3',
  })

  assert.deepEqual(result, { id: 'u-9', roleKeys: ['admin'] })
  assert.deepEqual(created, { data: [{ userId: 'u-9', roleId: 2 }] })
  assert.equal(auditCalls.length, 1)
  const call = auditCalls[0] as AuditCall
  assert.equal(call.method, 'recordRoleChange')
  assert.equal(call.transaction, transaction)
  assert.deepEqual(call.input, {
    userId: 'u-9',
    nickname: '韩立',
    before: ['user'],
    after: ['admin'],
    requestId: 'req-3',
  })
})

test('changeRoles：输入顺序不影响判定，集合相同即视为无变化、不写审计', async () => {
  let deleted = false
  const { service, auditCalls } = createService({
    tx: {
      $queryRaw: async () => [],
      user: {
        findFirst: async () => ({
          id: 'u-9',
          nickname: '韩立',
          roles: [{ role: { id: 1, key: 'user' } }, { role: { id: 2, key: 'admin' } }],
        }),
      },
      userRole: {
        deleteMany: async () => {
          deleted = true
          return { count: 2 }
        },
      },
    },
  })

  // 传的顺序与库里的顺序相反，但集合相同 → 幂等空操作
  const result = await service.changeRoles('u-9', { roleKeys: ['user', 'admin'] } as ChangeUserRolesDto, superAdmin)

  assert.deepEqual(result, { id: 'u-9', roleKeys: ['admin', 'user'] })
  assert.equal(deleted, false, '没有变化就不该去删关联')
  assert.equal(auditCalls.length, 0, '审计记的是变更：before === after 只会稀释审计')
})

test('changeRoles：不能改自己的角色', async () => {
  const { service, auditCalls } = createService({ tx: {} })

  await assert.rejects(
    service.changeRoles('u-root', { roleKeys: ['admin'] } as ChangeUserRolesDto, superAdmin),
    error => (error as { getStatus(): number }).getStatus() === 403,
  )
  assert.equal(auditCalls.length, 0)
})

test('changeRoles：没有编辑权限时拒绝', async () => {
  const { service, auditCalls } = createService({ tx: {} })
  const noPermission: AuthUser = { ...superAdmin, permissionKeys: [] }

  await assert.rejects(
    service.changeRoles('u-9', { roleKeys: ['admin'] } as ChangeUserRolesDto, noPermission),
    error => (error as { getStatus(): number }).getStatus() === 403,
  )
  assert.equal(auditCalls.length, 0)
})

test('changeRoles：目标是超管时拒绝，且不写审计', async () => {
  const { service, auditCalls } = createService({
    tx: {
      $queryRaw: async () => [],
      user: {
        findFirst: async () => ({
          id: 'u-9',
          nickname: 'root2',
          roles: [{ role: { id: 3, key: 'super_admin' } }],
        }),
      },
    },
  })

  await assert.rejects(
    service.changeRoles('u-9', { roleKeys: ['admin'] } as ChangeUserRolesDto, superAdmin),
    error => (error as { getStatus(): number }).getStatus() === 403,
  )
  assert.equal(auditCalls.length, 0)
})

test('changeRoles：角色未 seed 时给 400，而不是把外键错误漏成 500', async () => {
  const { service, auditCalls } = createService({
    tx: {
      $queryRaw: async () => [],
      user: {
        findFirst: async () => ({ id: 'u-9', nickname: '韩立', roles: [{ role: { id: 1, key: 'user' } }] }),
      },
      role: { findMany: async () => [] },
    },
  })

  await assert.rejects(
    service.changeRoles('u-9', { roleKeys: ['admin'] } as ChangeUserRolesDto, superAdmin),
    error => (error as { getStatus(): number }).getStatus() === 400,
  )
  assert.equal(auditCalls.length, 0)
})

test('changeRoles：**先锁用户行、再读角色**（顺序就是并发正确性）', async () => {
  const order: string[] = []
  const { service } = createService({
    tx: {
      $queryRaw: async () => {
        order.push('lock')
        return []
      },
      user: {
        findFirst: async () => {
          order.push('findFirst')
          return { id: 'u-9', nickname: '韩立', roles: [{ role: { id: 1, key: 'user' } }] }
        },
      },
      role: {
        findMany: async () => {
          order.push('findMany')
          return [{ id: 2, key: 'admin' }]
        },
      },
      userRole: {
        deleteMany: async () => {
          order.push('deleteMany')
          return { count: 1 }
        },
        createMany: async () => {
          order.push('createMany')
          return { count: 1 }
        },
      },
    },
  })

  await service.changeRoles('u-9', { roleKeys: ['admin'] } as ChangeUserRolesDto, superAdmin)

  // 锁必须在**读之前**：先读后锁的话，读到的可能是别人改到一半的状态
  assert.deepEqual(order, ['lock', 'findFirst', 'findMany', 'deleteMany', 'createMany'])
})
