import assert from 'node:assert/strict'
import { test } from 'vitest'
import type { AuthUser } from '../../common/http-context'
import { ShareService } from '../share.service'

/**
 * 管理页的列表/详情。
 *
 * 钉两条容易写错、而且**错了不会被任何类型检查发现**的规则：
 *
 * 1. 状态筛选的 where 必须覆盖全集，且**撤销优先于过期**
 *    （一条既撤销又过期的链接，管理员该看到"已撤销"——那是有人主动做的事）
 * 2. 归属过滤：别人的链接**根本查不到**，不是"查出来再过滤"
 */

const USER = { userId: 'u-1', roleKeys: [], permissionKeys: [] } as unknown as AuthUser

type ShareServiceDeps = ConstructorParameters<typeof ShareService>

function createService(options: {
  count?: () => Promise<number>
  findMany?: (args: unknown) => Promise<unknown[]>
  findFirst?: (args: unknown) => Promise<unknown>
}) {
  const calls: Array<{ model: string; method: string; args: unknown }> = []
  const prisma = {
    shareLink: {
      count: async (args: unknown) => {
        calls.push({ model: 'shareLink', method: 'count', args })
        return options.count ? options.count() : 0
      },
      findMany: async (args: unknown) => {
        calls.push({ model: 'shareLink', method: 'findMany', args })
        return options.findMany ? options.findMany(args) : []
      },
      findFirst: async (args: unknown) => {
        calls.push({ model: 'shareLink', method: 'findFirst', args })
        return options.findFirst ? options.findFirst(args) : null
      },
      update: async () => ({}),
    },
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  }
  const service = new ShareService(
    prisma as unknown as ShareServiceDeps[0],
    {} as unknown as ShareServiceDeps[1],
    {} as unknown as ShareServiceDeps[2],
  )
  return { service, calls }
}

test('状态筛选：三档互斥且合起来覆盖全集', async () => {
  const expected: Record<string, (where: Record<string, unknown>) => void> = {
    active: where => {
      assert.equal(where.revokedAt, null, 'active 必须排除已撤销')
      assert.ok(where.expiresAt, 'active 必须带过期条件')
    },
    expired: where => {
      assert.equal(where.revokedAt, null, 'expired 只统计"未撤销但过期"')
      assert.ok(where.expiresAt)
    },
    revoked: where => {
      assert.ok(where.revokedAt && typeof where.revokedAt === 'object', 'revoked 用 not: null')
      assert.equal(where.expiresAt, undefined, 'revoked 不再谈过期')
    },
  }

  for (const [status, check] of Object.entries(expected)) {
    const { service, calls } = createService({})
    await service.listOwned({ page: 1, pageSize: 20, status: status as 'active' }, USER)
    const countCall = calls.find(call => call.method === 'count')
    assert.ok(countCall)
    check((countCall.args as { where: Record<string, unknown> }).where)
  }
})

test('归属过滤写进 where：别人的链接根本查不到', async () => {
  const { service, calls } = createService({})
  await service.listOwned({ page: 1, pageSize: 20 }, USER)

  for (const call of calls.filter(item => item.method !== 'findFirst')) {
    const where = (call.args as { where: { resume?: { workspaceUserId?: string } } }).where
    assert.equal(where.resume?.workspaceUserId, 'u-1', `${call.method} 缺少归属过滤`)
  }
})

test('撤销优先于过期：既撤销又过期 → 显示为已撤销', async () => {
  const now = Date.now()
  const { service } = createService({
    count: async () => 1,
    findMany: async () => [
      {
        id: 's-1',
        token: 'tok',
        resumeId: 1,
        expiresAt: new Date(now - 86_400_000),
        revokedAt: new Date(now - 3_600_000),
        revokedReason: 'manual',
        label: null,
        note: null,
        allowAi: false,
        allowPdf: true,
        createdAt: new Date(now - 7_200_000),
        lastAccessAt: null,
        resume: { name: '某简历', publishedAt: new Date(now - 86_400_000) },
      },
    ],
  })

  const page = await service.listOwned({ page: 1, pageSize: 20 }, USER)
  assert.equal(page.items[0].status, 'revoked', '撤销是主动行为，优先展示')
  // 已撤销就不再谈"还剩几天"——给 null，避免前端显示成"已过期 -1 天"
  assert.equal(page.items[0].expiresInDays, null)
})

test('未撤销但已过期 → expired，且剩余天数为负', async () => {
  const now = Date.now()
  const { service } = createService({
    count: async () => 1,
    findMany: async () => [
      {
        id: 's-2',
        token: 'tok2',
        resumeId: 1,
        expiresAt: new Date(now - 2 * 86_400_000),
        revokedAt: null,
        revokedReason: null,
        label: '投给 A 公司',
        note: null,
        allowAi: false,
        allowPdf: true,
        createdAt: new Date(now - 3 * 86_400_000),
        lastAccessAt: null,
        resume: { name: '某简历', publishedAt: null },
      },
    ],
  })

  const page = await service.listOwned({ page: 1, pageSize: 20 }, USER)
  assert.equal(page.items[0].status, 'expired')
  assert.ok((page.items[0].expiresInDays ?? 0) < 0)
  // 简历已取消发布 —— 管理页要能解释"为什么读不了"
  assert.equal(page.items[0].resumePublished, false)
})
