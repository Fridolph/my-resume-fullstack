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
  /** 日志最小级别阈值；默认 `info`（见 LOG_LEVELS） */
  LOG_LEVEL: LogLevel
  /** 是否把日志**同时**写入本地文件；未配置时 development 默认开、其余环境默认关 */
  LOG_FILE_ENABLED: boolean
  /** 本地日志目录（相对进程工作目录）；默认 `logs` */
  LOG_FILE_DIR: string
}

const NODE_ENVS = ['development', 'test', 'production'] as const

/** 注意 `ms` 必须排在 `m` 前面：正则交替是从左往右匹配的 */
const EXPIRES_IN_PATTERN = /^\d+(ms|s|m|h|d|w|y)$/

/**
 * pino 支持的日志级别。
 *
 * 用 `as const` 数组派生出联合类型（而不是把级别写两遍）：**校验规则与类型同源**，
 * 以后加一个级别不会出现"校验放行但类型不认"的错位。
 */
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

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

  // 日志级别：可选，默认 info。**校验成枚举而不是放行任意字符串** ——
  // pino 对未知级别会静默按 info 处理（或直接抛），两种都是"配错了却看不出来"；
  // 与其到线上才发现 debug 一直没输出，不如启动时指名道姓。
  const logLevel = String(raw.LOG_LEVEL ?? 'info')
    .trim()
    .toLowerCase()
  if (!(LOG_LEVELS as readonly string[]).includes(logLevel)) {
    errors.push(`LOG_LEVEL 只能是 ${LOG_LEVELS.join(' / ')}，当前是 "${String(raw.LOG_LEVEL ?? '')}"`)
  }

  // 本地日志文件：**默认跟随环境** —— development 开（便于查阅排查），其余关。
  // 关掉的理由不是"不需要"，而是生产环境通常已由平台采集 stdout，再写一份本地文件
  // 容易出现"两份日志、保留策略不一致"，反而更难判断哪份是准的。
  // 自托管 / 无采集器时用 `LOG_FILE_ENABLED=true` 显式打开。
  const fileEnabledRaw = raw.LOG_FILE_ENABLED
  let logFileEnabled = nodeEnv === 'development'
  if (fileEnabledRaw !== undefined && String(fileEnabledRaw).trim() !== '') {
    const normalized = String(fileEnabledRaw).trim().toLowerCase()
    if (['true', '1', 'yes'].includes(normalized)) {
      logFileEnabled = true
    } else if (['false', '0', 'no'].includes(normalized)) {
      logFileEnabled = false
    } else {
      errors.push(`LOG_FILE_ENABLED 只能是 true / false，当前是 "${String(fileEnabledRaw)}"`)
    }
  }

  const logFileDir = String(raw.LOG_FILE_DIR ?? 'logs').trim() || 'logs'

  if (errors.length > 0) {
    throw new Error(`环境变量校验失败：\n  - ${errors.join('\n  - ')}`)
  }

  return {
    NODE_ENV: nodeEnv as EnvConfig['NODE_ENV'],
    PORT: port,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn as ExpiresInLiteral,
    DATABASE_URL: databaseUrl,
    LOG_LEVEL: logLevel as LogLevel,
    LOG_FILE_ENABLED: logFileEnabled,
    LOG_FILE_DIR: logFileDir,
  }
}
