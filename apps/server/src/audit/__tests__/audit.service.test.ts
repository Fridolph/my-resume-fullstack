import assert from 'node:assert/strict'
import { test } from 'vitest'
import { AUDIT_ACTIONS } from '@rs/common'
import { AuditService } from '../audit.service'
import type { AuthUser } from '../../common/http-context'

/** 只实现被调用到的方法；类型放宽理由见 `createService` */
function createService(input: { txCreate?: (args: unknown) => Promise<unknown>; prismaCreate?: () => void }) {
  const txCreates: unknown[] = []
  const transaction = {
    auditLog: {
      create: async (args: unknown) => {
        txCreates.push(args)
        return input.txCreate ? input.txCreate(args) : args
      },
    },
  }
  const prismaService = {
    auditLog: { create: input.prismaCreate ?? (() => {}) },
  }
  const service = new AuditService(prismaService as never)
  return { service, transaction, txCreates }
}

const actor: AuthUser = {
  userId: 'u-8',
  email: 'who@example.com',
  nickname: '昇哥',
  sessionVersion: 1,
  roleKeys: ['super_admin'],
  permissionKeys: [],
}

test('record：写进**传入的事务**，而不是服务自己的客户端', async () => {
  let prismaCreateCalled = false
  const { service, transaction, txCreates } = createService({
    prismaCreate: () => {
      prismaCreateCalled = true
    },
  })

  await service.record(transaction as never, actor, {
    action: AUDIT_ACTIONS.resumeDelete,
    resourceType: 'resume',
    resourceId: '42',
  })

  assert.equal(txCreates.length, 1, '必须写进调用方给的事务')
  assert.equal(prismaCreateCalled, false, '绝不走服务自己的连接（那样就脱离了业务事务）')
})

test('record：操作者信息全部来自 AuthUser，不从 input 取', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.record(transaction as never, actor, {
    action: AUDIT_ACTIONS.resumeDelete,
    resourceType: 'resume',
    resourceId: '42',
    // 即使调用方塞入伪造的操作者字段，也不该被采用（它们不在 AuditRecordInput 上）
    ...({ actorId: 'someone-else' } as object),
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.actorId, 'u-8')
  assert.deepEqual(data.actorSnapshot, { nickname: '昇哥' })
  assert.deepEqual(data.actorRoleKeys, ['super_admin'])
  assert.equal('email' in (data.actorSnapshot as object), false, '快照不存邮箱（User 软删，join 得到）')
})

test('record：metadata 过白名单，PII 被丢弃', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.record(transaction as never, actor, {
    action: AUDIT_ACTIONS.resumeDelete,
    resourceType: 'resume',
    resourceId: '42',
    metadata: { revision: 9, sectionCount: 5, name: '张三', phone: '13800000000' },
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.deepEqual(data.metadata, { revision: 9, sectionCount: 5 })
})

test('record：metadata 全被裁掉时落 null，而不是 {}', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.record(transaction as never, actor, {
    action: AUDIT_ACTIONS.resumeDelete,
    resourceType: 'resume',
    resourceId: '42',
    metadata: { name: '张三' },
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.metadata, undefined, '未通过白名单 → 交由 Prisma 落 NULL')
})

test('record：requestId 缺省落 null（保持列有值语义一致）', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.record(transaction as never, actor, {
    action: AUDIT_ACTIONS.resumeCreate,
    resourceType: 'resume',
    resourceId: '7',
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.requestId, null)
})

test('recordResumeDeletion：语义化 helper 映射到正确的 action 与 metadata', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.recordResumeDeletion(transaction as never, actor, {
    resumeId: 7,
    name: '我的求职简历',
    revision: 9,
    sectionCount: 3,
    wasDefault: true,
    requestId: 'req-abc',
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.action, 'resume.delete')
  assert.equal(data.resourceType, 'resume')
  assert.equal(data.resourceId, '7', 'id 必须转成字符串（Users 是 cuid、Resumes 是整数）')
  assert.deepEqual(data.resourceSnapshot, { name: '我的求职简历' })
  assert.deepEqual(data.metadata, { revision: 9, sectionCount: 3, wasDefault: true })
  assert.equal(data.requestId, 'req-abc')
})

test('recordResumeSetDefault：记录**被顶掉的那一份**（变更前的状态）', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.recordResumeSetDefault(transaction as never, actor, {
    resumeId: 7,
    name: '我的求职简历',
    previousDefaultId: 3,
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.action, 'resume.set_default')
  assert.deepEqual(data.metadata, { previousDefaultId: 3 })
  // 没传 requestId 时落 null，而不是缺字段
  assert.equal(data.requestId, null)
})

test('recordResumeCreation：名字走 resourceSnapshot，locale 走 metadata', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.recordResumeCreation(transaction as never, actor, {
    resumeId: 7,
    name: '我的求职简历',
    locale: 'zh',
    requestId: 'req-abc',
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.action, 'resume.create')
  assert.equal(data.resourceId, '7')
  // 两者职责不同：快照是"资源当时长什么样"，metadata 是"动作的特有信息"
  assert.deepEqual(data.resourceSnapshot, { name: '我的求职简历' })
  assert.deepEqual(data.metadata, { locale: 'zh' })
  assert.equal(data.requestId, 'req-abc')
})

test('recordUserCreation：resourceId 是**新建用户**，角色走 metadata', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.recordUserCreation(transaction as never, actor, {
    userId: 'u-77',
    nickname: '厉飞雨',
    roleKeys: ['admin'],
    requestId: 'req-new',
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.action, 'user.create')
  // 方案 A：资源是"被操作的人"，不是操作者（actorId 已经在 record 里固定成 u-8）
  assert.equal(data.resourceType, 'user')
  assert.equal(data.resourceId, 'u-77')
  assert.notEqual(data.resourceId, data.actorId)
  assert.deepEqual(data.resourceSnapshot, { nickname: '厉飞雨' })
  assert.deepEqual(data.metadata, { roleKeys: ['admin'] })
})

test('recordUserDeletion：快照自包含（昵称 + 删除前的角色集合）', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.recordUserDeletion(transaction as never, actor, {
    userId: 'u-88',
    nickname: '韩立',
    roleKeys: ['user', 'admin'],
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.action, 'user.delete')
  assert.equal(data.resourceId, 'u-88')
  assert.deepEqual(data.resourceSnapshot, { nickname: '韩立' })
  assert.deepEqual(data.metadata, { roleKeys: ['user', 'admin'] })
  assert.equal(data.requestId, null)
  // 快照里不得出现邮箱 / 手机号一类的 PII（验收标准第 3 条）
  assert.equal('email' in (data.resourceSnapshot as object), false)
})

test('recordRoleChange：before / after 两端都落库，且不含 PII', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.recordRoleChange(transaction as never, actor, {
    userId: 'u-99',
    nickname: '南宫婉',
    before: ['user'],
    after: ['admin', 'user'],
    requestId: 'req-role',
    // 即使调用方塞进白名单之外的字段，也会被 pickAuditMetadata 裁掉
    ...({ metadata: { permissionKeys: ['Audit.Log:view'] } } as object),
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.equal(data.action, 'role.change')
  assert.equal(data.resourceType, 'user')
  assert.equal(data.resourceId, 'u-99')
  assert.deepEqual(data.resourceSnapshot, { nickname: '南宫婉' })
  // 记的是**角色键集合**：权限随预设漂移，写进审计会失真
  assert.deepEqual(data.metadata, { before: ['user'], after: ['admin', 'user'] })
  assert.equal(data.requestId, 'req-role')
})

test('recordRoleChange：昵称为空时也照写（快照与 PII 的取舍不因缺字段而变）', async () => {
  const { service, transaction, txCreates } = createService({})
  await service.recordRoleChange(transaction as never, actor, {
    userId: 'u-100',
    nickname: null,
    before: ['user'],
    after: ['admin'],
  })

  const { data } = txCreates[0] as { data: Record<string, unknown> }
  assert.deepEqual(data.resourceSnapshot, { nickname: null })
})

test('list：action 过滤落到 where；不传时不留 undefined 键', async () => {
  const whereSeen: unknown[] = []
  const prismaService = {
    auditLog: {
      findMany: async (args: { where: unknown }) => {
        whereSeen.push(args.where)
        return []
      },
      count: async () => 0,
    },
    // 服务里用的是数组形式 $transaction([findMany, count])
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  }
  const service = new AuditService(prismaService as never)

  await service.list({ action: 'role.change' })
  await service.list({})
  await service.list({ actorId: 'u-1' })

  assert.deepEqual(whereSeen[0], { action: 'role.change' })
  // 关键：不传就不该出现 `action: undefined` —— Prisma 会把它当成"要等于 undefined"
  assert.deepEqual(whereSeen[1], {})
  assert.deepEqual(whereSeen[2], { actorId: 'u-1' })
})
