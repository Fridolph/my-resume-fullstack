import { describe, expect, it } from 'vitest'
import { parseCorsOrigins, validateEnv } from '../env.validation'

/**
 * B2（CORS 白名单）的单元测试。
 *
 * 这里钉的是**两条安全性质**，不是"配置长得对"：
 *
 * 1. `*`、带路径、末尾斜杠的来源必须被**拒绝** —— 前者等于没配（本轮要消灭的正是它），
 *    后者会让线上**永远匹配不上**（浏览器发的 `Origin` 只有 scheme+host+port），
 *    而症状是"本地好好的、上线后所有请求被拦"，很难一眼看出是配置错了。
 * 2. 生产环境**缺失即启动失败** —— 与 `JWT_SECRET` 同一条判据：
 *    不允许"忘了配就静默全放行"。这类错误静默通过时，谁也不会发现。
 *
 * 会让它变红的改动：允许 `*`；把路径当合法项；把生产的缺失降级为"默认放行"或空数组。
 */

const base = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a'.repeat(32),
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
}

describe('parseCorsOrigins', () => {
  it('切分 / 去空白 / 去重，并保持书写顺序', () => {
    const { origins, invalid } = parseCorsOrigins('http://localhost:4041, https://a.example.com ,http://localhost:4041')
    expect(origins).toEqual(['http://localhost:4041', 'https://a.example.com'])
    expect(invalid).toEqual([])
  })

  it('拒绝通配符 *（那正是本轮要消灭的东西）', () => {
    const { origins, invalid } = parseCorsOrigins('*')
    expect(origins).toEqual([])
    expect(invalid).toEqual(['*'])
  })

  it('拒绝带路径 / 末尾斜杠 / 缺协议 / 非 http(s) / 非法端口的项', () => {
    const bad = [
      'https://a.example.com/x',
      'https://a.example.com/',
      'a.example.com',
      'ftp://a.example.com',
      'http://a.example.com:abc',
    ]
    const { origins, invalid } = parseCorsOrigins(bad.join(','))
    expect(origins).toEqual([])
    expect(invalid).toEqual(bad)
  })

  it('接受 http / https，含端口', () => {
    expect(parseCorsOrigins('http://localhost:4041,https://resume.example.com').origins).toHaveLength(2)
    expect(parseCorsOrigins('https://resume.example.com:8443').origins).toEqual(['https://resume.example.com:8443'])
  })

  it('空串 / 只有分隔符 → 空数组（"能不能为空"由环境策略决定，不是这个函数的职责）', () => {
    expect(parseCorsOrigins('').origins).toEqual([])
    expect(parseCorsOrigins(' , , ').origins).toEqual([])
  })
})

describe('validateEnv 的 CORS 策略', () => {
  it('生产缺失 CORS_ORIGINS → 启动失败，错误信息点名该变量', () => {
    expect(() => validateEnv({ ...base })).toThrow(/CORS_ORIGINS/)
  })

  it('生产配了非法项 → 启动失败并点名那一项', () => {
    expect(() => validateEnv({ ...base, CORS_ORIGINS: 'https://ok.example.com,*' })).toThrow(/CORS_ORIGINS 含非法来源/)
  })

  it('生产配全合法 → 解析成数组', () => {
    const env = validateEnv({ ...base, CORS_ORIGINS: 'https://a.example.com,https://b.example.com' })
    expect(env.CORS_ORIGINS).toEqual(['https://a.example.com', 'https://b.example.com'])
  })

  it('development 未配置 → 用两个本地 Nuxt 应用的默认值', () => {
    const env = validateEnv({ NODE_ENV: 'development', JWT_SECRET: base.JWT_SECRET, DATABASE_URL: base.DATABASE_URL })
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:4041', 'http://localhost:4047'])
  })

  it('test 允许为空：隔离测试用 curl 不带 Origin，CORS 根本不参与', () => {
    expect(validateEnv({ NODE_ENV: 'test' }).CORS_ORIGINS).toEqual([])
  })
})
