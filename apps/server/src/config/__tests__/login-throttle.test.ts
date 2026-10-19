import { describe, expect, it } from 'vitest'
import { validateEnv } from '../env.validation'

/**
 * B3 的环境策略测试。
 *
 * 钉住的是"配错了就启动失败"，而不是"默认值对不对"：
 * 限流的两个数一旦被配成 0 或负数，throttler 的语义是**未定义**的
 * （可能变成"永不限流"、也可能"一律拒绝"），而两种都不会报错 ——
 * 与 `LOG_LEVEL` / `CORS_ORIGINS` 那两条是同一类风险：**静默的错误配置**。
 *
 * 会让它变红的改动：允许 0 / 负数 / 小数直接透传；把空串当成 0（那样 `.env` 里写了
 * `LOGIN_THROTTLE_LIMIT=` 就会把限流关掉，而人以为它开着）。
 */

describe('validateEnv 的登录限流策略', () => {
  it('默认 5 次 / 60 秒（毫秒 60000）', () => {
    const env = validateEnv({ NODE_ENV: 'test' })
    expect(env.LOGIN_THROTTLE_LIMIT).toBe(5)
    expect(env.LOGIN_THROTTLE_TTL_MS).toBe(60_000)
  })

  it('可被环境变量覆盖', () => {
    const env = validateEnv({ NODE_ENV: 'test', LOGIN_THROTTLE_LIMIT: '10', LOGIN_THROTTLE_TTL_MS: '30000' })
    expect(env.LOGIN_THROTTLE_LIMIT).toBe(10)
    expect(env.LOGIN_THROTTLE_TTL_MS).toBe(30_000)
  })

  it('空串视为未配置，取默认值（与 LOG_FILE_ENABLED 同一约定）', () => {
    const env = validateEnv({ NODE_ENV: 'test', LOGIN_THROTTLE_LIMIT: '  ', LOGIN_THROTTLE_TTL_MS: '' })
    expect(env.LOGIN_THROTTLE_LIMIT).toBe(5)
    expect(env.LOGIN_THROTTLE_TTL_MS).toBe(60_000)
  })

  it('0 / 负数 / 小数 / 非数字 → 启动失败并点名变量', () => {
    for (const bad of ['0', '-1', '1.5', 'abc']) {
      expect(() => validateEnv({ NODE_ENV: 'test', LOGIN_THROTTLE_LIMIT: bad })).toThrow(/LOGIN_THROTTLE_LIMIT/)
      expect(() => validateEnv({ NODE_ENV: 'test', LOGIN_THROTTLE_TTL_MS: bad })).toThrow(/LOGIN_THROTTLE_TTL_MS/)
    }
  })
})
