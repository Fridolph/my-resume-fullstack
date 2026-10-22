import assert from 'node:assert/strict'
import { test } from 'vitest'
import { PostgresShareEventSink } from '../share-event.sink'

/**
 * 事件 sink 的两条不可让渡的保证：
 *
 * 1. `name` / `category` / `action` 三个字段必须来自**登记表**，不能由调用方各填各的
 * 2. 写入失败**不冒泡** —— 埋点失败绝不能导致"看不了简历"
 */

function createSink(create: (args: unknown) => Promise<unknown>) {
  const prisma = { shareEvent: { create } } as unknown as ConstructorParameters<typeof PostgresShareEventSink>[0]
  return new PostgresShareEventSink(prisma)
}

test('三个命名字段来自登记表，调用方只给 type', async () => {
  const writes: Array<Record<string, unknown>> = []
  const sink = createSink(async args => {
    writes.push((args as { data: Record<string, unknown> }).data)
    return {}
  })

  await sink.record({ shareId: 'share-1', type: 'linkViewed', revision: 7, ipAddress: '203.0.113.9' })

  assert.equal(writes.length, 1)
  assert.equal(writes[0].name, 'share.link.viewed')
  assert.equal(writes[0].category, 'access')
  assert.equal(writes[0].action, 'viewed')
  assert.equal(writes[0].revision, 7)
  assert.equal(writes[0].ipAddress, '203.0.113.9')
  // 没给的维度写 null，而不是 undefined（列上有明确的"没有"语义）
  assert.equal(writes[0].themeKey, null)
  assert.equal(writes[0].targetHost, null)
})

test('写入失败不冒泡 —— 埋点失败不能影响主流程', async () => {
  const sink = createSink(async () => {
    throw new Error('数据库炸了')
  })

  // 关键：不应 reject。调用方是 `void sink.record(...)`，一旦 reject 就是未处理的 rejection
  await assert.doesNotReject(sink.record({ shareId: 'share-1', type: 'pdfDownloaded' }))
})

test('事件里没有可以塞任意内容的通道', async () => {
  const writes: Array<Record<string, unknown>> = []
  const sink = createSink(async args => {
    writes.push((args as { data: Record<string, unknown> }).data)
    return {}
  })

  await sink.record({
    shareId: 'share-1',
    type: 'externalClicked',
    targetHost: 'example.com',
    pagePath: '/share',
  })

  // 只存 host，不存完整 URL（完整 URL 可能含私密参数）
  assert.equal(writes[0].targetHost, 'example.com')
  // 没有任何 `metadata` 一类的自由 JSON 通道
  assert.equal('metadata' in writes[0], false)
})
