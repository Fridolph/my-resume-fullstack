import assert from 'node:assert/strict'
import { test } from 'vitest'
import { SHARE_MAX_DAYS, resolveShareExpiry } from '../share.types'

/**
 * 有效期解析。
 *
 * 这一组钉的是**上限与边界**，因为"有效期"是本功能的唯一闸门：
 * 一旦能建出超长链接，后面的撤销、埋点、隐私处理都失去意义。
 *
 * 固定 `now` 而不是用当前时间：否则测试在每月最后一天、或 23:59 附近会偶发失败。
 */

const NOW = new Date('2026-10-08T10:30:00.000Z')

test('today = 到当天 23:59:59.999（UTC）', () => {
  const result = resolveShareExpiry('today', undefined, NOW)
  assert.ok(result)
  assert.equal(result.expiresAt.toISOString(), '2026-10-08T23:59:59.999Z')
})

test('3d / 7d / 30d 就是 now + N 天', () => {
  const three = resolveShareExpiry('3d', undefined, NOW)
  assert.ok(three)
  assert.equal(three.expiresAt.toISOString(), '2026-10-11T10:30:00.000Z')
  assert.equal(three.days, 3)

  assert.equal(resolveShareExpiry('7d', undefined, NOW)?.days, 7)
  assert.equal(resolveShareExpiry('30d', undefined, NOW)?.days, 30)
})

test('自定义：1..90 天合法', () => {
  assert.equal(resolveShareExpiry('custom', 1, NOW)?.days, 1)
  assert.equal(resolveShareExpiry('custom', SHARE_MAX_DAYS, NOW)?.days, SHARE_MAX_DAYS)
})

test('自定义超限 / 非法 → null（由调用方转 400）', () => {
  for (const bad of [0, -1, SHARE_MAX_DAYS + 1, 1.5, Number.NaN]) {
    assert.equal(resolveShareExpiry('custom', bad, NOW), null, `应拒绝：${bad}`)
  }
  // 选 custom 却没给天数 —— schema 已经拦了，纯函数也不放行（非 HTTP 入口绕过 schema 时仍安全）
  assert.equal(resolveShareExpiry('custom', undefined, NOW), null)
})

test('到期时间随时钟推进，不是写死的偏移', () => {
  const later = new Date('2026-10-09T10:30:00.000Z')
  const a = resolveShareExpiry('3d', undefined, NOW)
  const b = resolveShareExpiry('3d', undefined, later)
  assert.ok(a && b)
  assert.equal(b.expiresAt.getTime() - a.expiresAt.getTime(), 24 * 60 * 60 * 1000)
})
