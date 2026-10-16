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
