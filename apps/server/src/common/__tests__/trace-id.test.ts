import { describe, expect, it } from 'vitest'
import { ensureTraceId, type TraceIdCarrier } from '../trace-id'

/**
 * `ensureTraceId` 的单元测试。
 *
 * 这组测试保护的是 DAO-044 的头号风险：**traceId 只能有一个生成处**。
 * 它之所以能同时被 `TraceIdMiddleware` 与 `pino-http` 的 `genReqId` 调用而不产生分叉，
 * 全靠**幂等**这一条性质 —— 所以幂等不是实现细节，是契约。
 *
 * 会让它变红的改动：把 `if (req.traceId) return req.traceId` 去掉（第二次调用会重新生成）；
 * 把上游头改成"永远以自己生成的为准"（上游透传断掉）；把空串当成有效值
 * （`x-request-id: ` 会让全链路共用一个空 ID）。
 */
describe('ensureTraceId', () => {
  it('第一次调用时生成，并写回 req.traceId', () => {
    const request: TraceIdCarrier = { headers: {} }
    const traceId = ensureTraceId(request)

    expect(traceId).toMatch(/^[0-9a-f-]{36}$/) // randomUUID 的形状
    expect(request.traceId).toBe(traceId)
  })

  it('幂等：重复调用返回同一个值，不会二次生成', () => {
    const request: TraceIdCarrier = { headers: {} }
    const first = ensureTraceId(request)
    const second = ensureTraceId(request)
    const third = ensureTraceId(request)

    expect(second).toBe(first)
    expect(third).toBe(first)
  })

  it('已有 req.traceId 时直接复用，即使请求头带着别的值', () => {
    // 这正是"谁先执行都不影响结果"的机制：先到的已经写下结果，后到的只能读到它
    const request = { traceId: 'already-set', headers: { 'x-request-id': 'from-header' } }
    expect(ensureTraceId(request)).toBe('already-set')
    expect(request.traceId).toBe('already-set')
  })

  it('复用上游传来的 x-request-id（字符串与数组两种形态）', () => {
    expect(ensureTraceId({ headers: { 'x-request-id': 'upstream-1' } })).toBe('upstream-1')
    expect(ensureTraceId({ headers: { 'x-request-id': ['upstream-2', 'ignored'] } })).toBe('upstream-2')
    expect(ensureTraceId({ headers: { 'x-request-id': '  padded  ' } })).toBe('padded')
  })

  it('空串 / 纯空白视为没传，仍要自己生成', () => {
    // 否则一个 `x-request-id: ` 会让全链路共用一个空 ID —— 比没有 ID 更难查
    for (const value of ['', '   ', undefined]) {
      const request = { headers: value === undefined ? {} : { 'x-request-id': value } }
      const traceId = ensureTraceId(request)
      expect(traceId).not.toBe('')
      expect(traceId).toMatch(/^[0-9a-f-]{36}$/)
    }
  })
})
