import { describe, expect, it } from 'vitest'
import { buildPinoHttpOptions } from '../logging.config'

/**
 * `buildPinoHttpOptions` 的单元测试。
 *
 * 这里钉的**不是**"配置长得对"，而是三条**安全性质**（DAO-044 的验收 7 与测试计划）。
 * 它们的共同点是：**在真实请求里"碰巧没出问题"不算证明** —— 只有断言才能防止
 * 以后有人顺手加一个 body serializer 或把 headers 加回去。
 *
 * 会让它变红的改动：
 * - 在 `serializers.req` 里带上 `headers` 或 `body`（凭据 / 简历全文立刻进日志）
 * - 去掉 `customErrorObject`（5xx 的访问日志会多出一条指向 pino-http 内部的假栈）
 * - 把 `autoLogging.ignore` 去掉（探活请求淹没真日志）
 */

type Options = ReturnType<typeof buildPinoHttpOptions>

const build = () => buildPinoHttpOptions({ nodeEnv: 'test', level: 'info' })

describe('serializers.req：白名单，凭据根本不进日志', () => {
  it('只输出 id / method / url / remoteAddress / userAgent —— 不含 headers 与 body', () => {
    const options = build()
    const serialize = options.serializers?.req as (request: unknown) => Record<string, unknown>

    // 模拟 pino-http 实际传进来的对象（标准序列化器的输出，**不是** Express request）
    const output = serialize({
      id: 'trace-1',
      method: 'GET',
      url: '/api/resume',
      remoteAddress: '127.0.0.1',
      headers: { authorization: 'Bearer SECRET', cookie: 'my-resume.token=SECRET', 'user-agent': 'curl/9' },
    })

    expect(output).toEqual({
      id: 'trace-1',
      method: 'GET',
      url: '/api/resume',
      remoteAddress: '127.0.0.1',
      userAgent: 'curl/9',
    })

    // 关键断言：凭据所在的容器**整个不在输出里**
    expect(output).not.toHaveProperty('headers')
    expect(output).not.toHaveProperty('body')
    expect(JSON.stringify(output)).not.toContain('SECRET')
  })
})

describe('genReqId：只读不生成', () => {
  it('返回既有 traceId，并把同一个值写回请求（幂等 → 无第二生成处）', () => {
    const options = build()
    const genReqId = options.genReqId as (request: unknown) => string

    const request: { headers: Record<string, string>; traceId?: string } = { headers: { 'x-request-id': 'up-1' } }

    expect(genReqId(request)).toBe('up-1')
    expect(request.traceId).toBe('up-1')
    // 第二次调用必须还是同一个值 —— 否则 pino 与中间件会分叉
    expect(genReqId(request)).toBe('up-1')
  })
})

describe('customErrorObject：5xx 只留一条真实栈', () => {
  const options = build()
  const customErrorObject = options.customErrorObject as (
    request: unknown,
    response: unknown,
    error: unknown,
    loggable: Record<string, unknown>,
  ) => Record<string, unknown>

  it('丢掉 pino-http 合成的 "failed with status code 5xx" 占位错误', () => {
    const synthetic = new Error('failed with status code 500')
    const output = customErrorObject({}, {}, synthetic, { res: { statusCode: 500 }, err: synthetic, responseTime: 7 })

    expect(output).not.toHaveProperty('err')
    expect(output).toEqual({ res: { statusCode: 500 }, responseTime: 7 })
  })

  it('保留真实错误（res 上的 error 事件），只过滤占位的那一个', () => {
    const real = new Error('connection refused')
    const loggable = { res: { statusCode: 502 }, err: real, responseTime: 7 }

    expect(customErrorObject({}, {}, real, loggable)).toBe(loggable)
  })
})

describe('autoLogging：探活不记', () => {
  const ignore = (build().autoLogging as { ignore: (request: { url?: string }) => boolean }).ignore

  it('忽略 /api/health（含带查询串）；其余照记', () => {
    expect(ignore({ url: '/api/health' })).toBe(true)
    expect(ignore({ url: '/api/health?t=1' })).toBe(true)
    expect(ignore({ url: '/health' })).toBe(true)
    expect(ignore({ url: '/api/resume' })).toBe(false)
  })
})

describe('环境相关：只有本地开发上 pino-pretty', () => {
  it('development 用 prettier 渲染；test / production 保持 NDJSON', () => {
    // 生产与测试必须是 JSON —— 采集器要吃它，验收脚本也要按字段断言
    expect(buildPinoHttpOptions({ nodeEnv: 'development', level: 'info' })).toHaveProperty('transport')
    expect(buildPinoHttpOptions({ nodeEnv: 'test', level: 'info' })).not.toHaveProperty('transport')
    expect(buildPinoHttpOptions({ nodeEnv: 'production', level: 'info' })).not.toHaveProperty('transport')
  })

  it('脱敏路径覆盖 Bearer 与 Cookie 两种载体（兜底层）', () => {
    const paths = (build().redact as { paths: string[] }).paths
    expect(paths).toContain('req.headers.authorization')
    expect(paths).toContain('req.headers.cookie')
    expect(paths).toContain('res.headers["set-cookie"]')
  })
})
