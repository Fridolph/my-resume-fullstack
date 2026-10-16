/**
 * 账号与权限域审计的**数据库级**保证（Issue #56）。**只在显式授权时运行**：
 *
 *     pnpm --filter @rs/server test:audit:db
 *
 * ## 为什么这两条必须连真库
 *
 * 1. **同事务回滚**：`transaction` 抛错后，`user_roles` 与 `audit_logs` 必须**一起还原**。
 *    回滚是数据库行为，fake 只能"装作"回滚 —— 用 fake 测这条等于没测。
 * 2. **无外键 → 无级联**：`audit_logs` 不挂外键，所以用户被**物理删除**后审计行必须仍在，
 *    且靠自包含的 `resourceSnapshot` 仍能读懂"当时删的是谁"。
 *    这正是"User 已经是软删除、为什么还要存快照"的答案：软删除只是当下的策略，
 *    审计要活得更久。
 *
 * 用真实的 `role` 记录（seed 产物）而不是造一个新的：角色键与 `ROLE_PERMISSION_PRESETS`
 * 的对齐由 seed 校验，这里若凭空插入角色，反而绕开了那条约束。
 */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, test } from 'vitest'
import { PrismaClient } from '../../generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const tag = `VERIFY-ACCOUNT-AUDIT-${Date.now()}`
const actorId = `verify-actor-${randomUUID()}`
const targetId = `verify-target-${randomUUID()}`

afterAll(async () => {
  // 审计表没有外键，必须显式清理（这也是"无级联"的另一面）
  await prisma.auditLog.deleteMany({ where: { actorId } })
  await prisma.userRole.deleteMany({ where: { userId: { in: [actorId, targetId] } } })
  // 目标用户可能已被本文件物理删除；deleteMany 不会因此报错
  await prisma.user.deleteMany({ where: { id: { in: [actorId, targetId] } } })
  await prisma.$disconnect()
})

test('角色变更：业务与审计同事务 —— 回滚后角色关联与审计一起消失', async () => {
  const roleUser = await prisma.role.findUnique({ where: { key: 'user' }, select: { id: true } })
  const roleAdmin = await prisma.role.findUnique({ where: { key: 'admin' }, select: { id: true } })
  assert.ok(roleUser && roleAdmin, '角色必须已 seed：pnpm --filter @rs/server db:seed')

  // ⚠️ 数据库有 CHECK 约束 `users_username_or_email_check`：username 或 email 至少一个
  await prisma.user.create({
    data: { id: actorId, nickname: `${tag}-actor`, email: `${tag}-actor@verify.local`, passwordHash: 'x' },
  })
  await prisma.user.create({
    data: { id: targetId, nickname: `${tag}-target`, email: `${tag}-target@verify.local`, passwordHash: 'x' },
  })
  await prisma.userRole.create({ data: { userId: targetId, roleId: roleUser?.id as number } })

  await assert.rejects(
    prisma.$transaction(async transaction => {
      // 与 UserService.changeRoles 的写序一致：先清、再建、最后写审计
      await transaction.userRole.deleteMany({ where: { userId: targetId } })
      await transaction.userRole.createMany({ data: [{ userId: targetId, roleId: roleAdmin?.id as number }] })
      await transaction.auditLog.create({
        data: {
          actorId,
          actorSnapshot: { nickname: `${tag}-actor` },
          actorRoleKeys: ['super_admin'],
          action: 'role.change',
          resourceType: 'user',
          resourceId: targetId,
          resourceSnapshot: { nickname: `${tag}-target` },
          metadata: { before: ['user'], after: ['admin'] },
          requestId: 'verify-account-1',
        },
      })

      throw new Error('force rollback')
    }),
    /force rollback/,
  )

  const remaining = await prisma.userRole.findMany({
    where: { userId: targetId },
    select: { role: { select: { key: true } } },
  })
  assert.deepEqual(
    remaining.map(assignment => assignment.role.key),
    ['user'],
    '回滚后角色关联必须还原成改动前的样子',
  )
  assert.equal(
    await prisma.auditLog.count({ where: { actorId, action: 'role.change' } }),
    0,
    '审计与业务同事务：业务回滚时它也必须消失，否则会出现"记录了一次没发生的变更"',
  )
})

test('删除账号：用户被物理删除后审计行仍在，且快照能独立读懂', async () => {
  await prisma.$transaction(async transaction => {
    await transaction.user.delete({ where: { id: targetId } })
    await transaction.auditLog.create({
      data: {
        actorId,
        actorSnapshot: { nickname: `${tag}-actor` },
        actorRoleKeys: ['super_admin'],
        action: 'user.delete',
        resourceType: 'user',
        resourceId: targetId,
        resourceSnapshot: { nickname: `${tag}-target` },
        metadata: { roleKeys: ['user'] },
        requestId: 'verify-account-2',
      },
    })
  })

  assert.equal(await prisma.user.count({ where: { id: targetId } }), 0, '目标用户已被物理删除')

  const audit = await prisma.auditLog.findFirst({ where: { actorId, action: 'user.delete' } })
  assert.ok(audit, '审计行不挂外键 —— 用户没了，记录必须在')
  assert.deepEqual(audit.resourceSnapshot, { nickname: `${tag}-target` })
  assert.deepEqual(audit.metadata, { roleKeys: ['user'] })
  assert.equal('email' in (audit.resourceSnapshot as object), false, '快照不得冗余采集 PII')
})

test('改角色的行锁语句在真库上可执行（raw SQL 不受类型检查保护）', async () => {
  // `UserService.changeRoles` 里那句 `SELECT … FOR UPDATE` 是**裸 SQL**：
  // 表名 / 列名写错、参数占位写错，TypeScript 都不会报 —— 只会在线上第一次改角色时炸。
  // 所以在这里真的跑一遍（操作者账号在本文件里始终存在，可以安全复用它做目标行）。
  const locked = await prisma.$transaction(async transaction => {
    return transaction.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${actorId} FOR UPDATE`
  })

  assert.deepEqual(
    locked.map(row => row.id),
    [actorId],
  )
})
