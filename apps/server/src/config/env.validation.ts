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
  /**
   * CORS 白名单：完整 origin 列表（协议 + 主机 + 可选端口），**不含通配符**。
   * `development` 有默认值（两个 Nuxt 应用）；`production` 必须显式配置，缺失即启动失败。
   */
  CORS_ORIGINS: string[]
  /** 登录限流：窗口内允许的登录尝试次数（每个 IP）。默认 5 */
  LOGIN_THROTTLE_LIMIT: number
  /** 登录限流窗口长度，**毫秒**（throttler v5 起单位是毫秒）。默认 60000 */
  LOGIN_THROTTLE_TTL_MS: number
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

/**
 * CORS 白名单里允许的 origin 形状：协议 + 主机 + 可选端口。
 *
 * **刻意不允许路径、末尾斜杠和通配符**：
 * - 浏览器发出的 `Origin` 头**永远只有** scheme + host + port。带路径的配置项永远匹配不上，
 *   而症状是"本地好好的、上线后所有请求被拦"—— 配错了却看不出是配置错了。
 * - `*` 正是本项要消灭的东西：全放行等于没配。
 */
const ORIGIN_PATTERN = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/

/** `development` 的默认来源：`apps/web` 与 `apps/admin` 两个 Nuxt 应用 */
const DEFAULT_DEV_ORIGINS = ['http://localhost:4041', 'http://localhost:4047']

/**
 * 把 `CORS_ORIGINS` 的原始字符串解析成白名单数组。
 *
 * 纯函数，只负责**切分 / 去空白 / 去重 / 形状校验**，不决定"能不能为空" ——
 * 那是环境策略（开发可空、生产不可空），留给 `validateEnv`。
 *
 * 拆出来是为了**能单测**：`*` 与非法项必须在这里被挑出来，
 * 而不是靠"跑一次真实请求看看有没有被拦"才发现配错了。
 *
 * @param value 逗号分隔的 origin 串（直接来自环境变量）
 * @returns `origins` 合法项（已去重，保持书写顺序）；`invalid` 非法项（原样保留，供报错点名）
 */
export function parseCorsOrigins(value: string): { origins: string[]; invalid: string[] } {
  const origins: string[] = []
  const invalid: string[] = []

  for (const item of value.split(',')) {
    const origin = item.trim()
    if (!origin) continue
    if (!ORIGIN_PATTERN.test(origin)) {
      invalid.push(origin)
      continue
    }
    if (!origins.includes(origin)) origins.push(origin)
  }

  return { origins, invalid }
}

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

  // ── CORS 白名单 ────────────────────────────────────────────────────────
  // 默认值**只在 development 给**：本地要联调两个 Nuxt 应用。
  // 生产没有默认值 —— 与 JWT_SECRET 同一条判据：不允许"忘了配就静默全放行"。
  const corsRaw = String(raw.CORS_ORIGINS ?? (nodeEnv === 'development' ? DEFAULT_DEV_ORIGINS.join(',') : '')).trim()
  const { origins: corsOrigins, invalid: invalidOrigins } = parseCorsOrigins(corsRaw)
  if (invalidOrigins.length > 0) {
    errors.push(
      `CORS_ORIGINS 含非法来源：${invalidOrigins.join('、')} —— 每项须形如 https://example.com ` +
        '或 http://localhost:4041（不允许通配符 *、路径、末尾斜杠）',
    )
  }
  if (corsOrigins.length === 0 && nodeEnv === 'production') {
    errors.push('缺少 CORS_ORIGINS：生产环境必须显式列出允许的站点来源，否则浏览器端无法调用本接口')
  }

  // ── 登录限流（B3）──────────────────────────────────────────────────────
  // 两个数都必须是**正整数**：0 或负数在 throttler 里语义未定义（可能变成"永不限流"
  // 或"一律拒绝"），而那两种都不会报错 —— 又一类"配错了却看不出来"。
  // 空串沿用与 `LOG_FILE_ENABLED` 一致的约定：视为未配置，取默认值。
  const throttleLimitRaw = String(raw.LOGIN_THROTTLE_LIMIT ?? '').trim()
  const loginThrottleLimit = throttleLimitRaw === '' ? 5 : Number(throttleLimitRaw)
  if (!Number.isInteger(loginThrottleLimit) || loginThrottleLimit <= 0) {
    errors.push(`LOGIN_THROTTLE_LIMIT 必须是正整数，当前是 "${throttleLimitRaw}"`)
  }

  const throttleTtlRaw = String(raw.LOGIN_THROTTLE_TTL_MS ?? '').trim()
  const loginThrottleTtlMs = throttleTtlRaw === '' ? 60_000 : Number(throttleTtlRaw)
  if (!Number.isInteger(loginThrottleTtlMs) || loginThrottleTtlMs <= 0) {
    errors.push(`LOGIN_THROTTLE_TTL_MS 必须是正整数（毫秒），当前是 "${throttleTtlRaw}"`)
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
    LOG_LEVEL: logLevel as LogLevel,
    LOG_FILE_ENABLED: logFileEnabled,
    LOG_FILE_DIR: logFileDir,
    CORS_ORIGINS: corsOrigins,
    LOGIN_THROTTLE_LIMIT: loginThrottleLimit,
    LOGIN_THROTTLE_TTL_MS: loginThrottleTtlMs,
  }
}
