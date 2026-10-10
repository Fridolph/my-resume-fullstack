/**
 * 环境变量校验 —— 由 `ConfigModule.forRoot({ validate })` 在**启动时**调用。
 *
 * ## 为什么要有这一步
 *
 * 配置缺失如果留到运行时才暴露，症状往往与原因隔得很远：
 * 比如 `JWT_SECRET` 没配，表现可能是"登录后立刻 401"，得翻好几层才定位到是配置问题。
 * 在这里提前拦住，启动直接失败并**指名道姓**缺了哪个变量，排查成本从"半小时"降到"一眼"。
 *
 * ## 为什么不引 Joi / Zod
 *
 * Nest 12 支持 Standard Schema（可接 Zod / Valibot / ArkType），等变量多到十来个、需要
 * 类型转换与默认值矩阵时再换更划算；眼下只有四个，手写更直观、也少一个依赖。
 * 判据是"约束复杂度是否已经超过手写的可读性"，不是"有没有更时髦的库"。
 */
/**
 * 时长字面量：数字 + 单位，与 `ms` 库的简写一致（`30m` / `2h` / `7d`）。
 * 单独定义它是为了让 `@nestjs/jwt` 的 `expiresIn` 类型（`ms` 的 `StringValue`）能对上 ——
 * 换句话说，**类型与校验规则在同一处表达**，不会一个改了另一个忘。
 */
export type ExpiresInLiteral = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`

export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production'
  PORT: number
  JWT_SECRET: string
  JWT_EXPIRES_IN: ExpiresInLiteral
  DATABASE_URL: string
}

const NODE_ENVS = ['development', 'test', 'production'] as const

/** 注意 `ms` 必须排在 `m` 前面：正则交替是从左往右匹配的 */
const EXPIRES_IN_PATTERN = /^\d+(ms|s|m|h|d|w|y)$/

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const errors: string[] = []

  const nodeEnv = String(raw.NODE_ENV ?? 'development')
  if (!(NODE_ENVS as readonly string[]).includes(nodeEnv)) {
    errors.push(`NODE_ENV 只能是 ${NODE_ENVS.join(' / ')}，当前是 "${nodeEnv}"`)
  }

  const jwtSecret = String(raw.JWT_SECRET ?? '').trim()
  if (!jwtSecret && nodeEnv !== 'test') {
    errors.push('缺少 JWT_SECRET（签发/校验令牌用；写进 .env，不要提交）')
  }
  if (jwtSecret && jwtSecret.length < 16) {
    errors.push('JWT_SECRET 太短，至少 16 个字符（太短容易被暴力猜解）')
  }

  const port = Number(raw.PORT ?? 4049)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    errors.push(`PORT 不是合法端口："${String(raw.PORT)}"`)
  }

  // 数据库连接串：非 test 环境必填。与 JWT_SECRET 同样的理由 —— 缺了就该启动失败，
  // 而不是等第一个查询抛一个看不出原因的错误
  const databaseUrl = String(raw.DATABASE_URL ?? '').trim()
  if (!databaseUrl && nodeEnv !== 'test') {
    errors.push('缺少 DATABASE_URL（PostgreSQL 连接串；本地可用仓库根的 compose.yaml 起库）')
  }
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL 必须是以 postgresql:// 开头的连接串')
  }

  const jwtExpiresIn = String(raw.JWT_EXPIRES_IN ?? '2h').trim()
  if (!EXPIRES_IN_PATTERN.test(jwtExpiresIn)) {
    errors.push(`JWT_EXPIRES_IN 格式不对："${jwtExpiresIn}"，应为「数字 + 单位」，如 30m / 2h / 7d`)
  }

  if (errors.length > 0) {
    throw new Error(`环境变量校验失败：\n  - ${errors.join('\n  - ')}`)
  }

  return {
    NODE_ENV: nodeEnv as EnvConfig['NODE_ENV'],
    PORT: port,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn as ExpiresInLiteral,
    DATABASE_URL: databaseUrl,
  }
}
