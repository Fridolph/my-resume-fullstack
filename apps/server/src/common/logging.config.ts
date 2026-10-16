import type { Options } from 'pino-http'
import { ensureTraceId } from './trace-id.middleware'

/** 构建 pino 配置所需的环境值（由 `ConfigService` 注入，不在这里摸 `process.env`） */
export interface LoggingSettings {
  readonly nodeEnv: string
  /** 最小级别阈值：`trace` / `debug` / `info` / `warn` / `error` / `fatal` */
  readonly level: string
}

/** 探活接口不记访问日志：它每秒被调一次，记下来只会淹没真日志 */
const SILENT_PATHS = new Set(['/api/health', '/health'])

/**
 * 凭据字段的**兜底**脱敏路径。
 *
 * ⚠️ 这是第二层，不是第一层。第一层在下面的 `serializers.req` —— 它**根本不带出 `headers`**，
 * 所以凭据压根没进过日志行。`redact` 留在这里，是为了"以后有人把 headers 加回来"时仍不泄。
 *
 * 路径用 pino 的点/括号记法；`set-cookie` 含连字符，必须用括号记法。
 */
const REDACT_PATHS = [
  'req.headers.authorization', // Bearer 载体
  'req.headers.cookie', // Cookie 载体（my-resume.token）
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]', // 回写下发的 cookie
]

/**
 * `pino-std-serializers` 的 req 输出形状。
 *
 * ⚠️ **这是本文件最容易误解的一点**，实测（2026-10-16）确认：
 * `pino-http` 默认 `wrapSerializers: true`，于是自定义的 `serializers.req` 收到的
 * **不是** Express 的 `Request`，而是**标准序列化器先跑完的结果** —— 一个普通对象，
 * 键为 `id / method / url / query / params / headers / remoteAddress / remotePort`。
 *
 * 直接后果（都是踩过的）：
 * - 上面**没有 `traceId`**（那是我们自己挂在 Express request 上的字段）；
 *   请求 ID 在 **`id`** 上，由 pino-http 用 `req.id = req.id || genReqId(req, res)` 写入。
 * - 上面**没有 `socket`**，所以取客户端地址只能用 `remoteAddress`，不能读 `socket.remoteAddress`。
 */
interface StandardSerializedRequest {
  id?: string
  method?: string
  url?: string
  remoteAddress?: string
  headers?: Record<string, string | string[] | undefined>
}

/** pino-http 在 5xx 时合成的占位错误，其 `message` 固定是这个前缀 */
const SYNTHETIC_STATUS_ERROR = /^failed with status code \d+$/

/**
 * 组装 `pino-http` 的配置。
 *
 * 抽成纯函数而不是直接写在 `app.module.ts` 的装饰器里，是为了**能单测它的安全性质** ——
 * 配置埋在装饰器里就只能靠"跑一遍真实请求"来验证。
 *
 * ## 三个安全取舍
 *
 * ### ① 请求序列化用**白名单**，不是"先记全再脱敏"
 *
 * 下面 `serializers.req` 返回的对象里**没有 `headers`、没有 body** —— 于是 `authorization` /
 * `cookie` 是"根本不带出来"，而不是"带出来再抹掉"。判据：**黑名单会漏，白名单会缺；
 * 日志场景里"缺"可接受，"漏"不可接受。**
 *
 * ### ② 绝不序列化请求体
 *
 * `pino-http` **默认不记 body**，这里也**不提供**任何 body 序列化入口。这一刀对本项目尤其关键：
 * `PUT /resume/:id/draft` 的请求体**就是整份简历 document**（姓名 / 电话 / 邮箱 / 教育 / 工作）。
 * 谁想"顺手加个 body 日志方便调试"，先读 `docs/server/09_日志系统_nestjs-pino_设计.md` §4.4。
 *
 * ### ③ 请求 ID 只读不生成
 *
 * `genReqId` 调 `ensureTraceId`（幂等：谁先到谁生成）—— 本配置**不关心执行顺序**，
 * 也不会产生第二个生成处。日志里的 `req.id` 因此必然等于响应头与响应体里的那个 `traceId`。
 *
 * @param settings 来自 `ConfigService` 的 `NODE_ENV` 与 `LOG_LEVEL`
 * @returns 可直接交给 `LoggerModule.forRootAsync` 的 `pinoHttp` 配置
 */
export function buildPinoHttpOptions(settings: LoggingSettings): Options {
  const isLocalDev = settings.nodeEnv === 'development'

  return {
    level: settings.level,

    // ⚠️ 读取既有值，不生成新值 —— 生成在 `ensureTraceId` 里，且它是幂等的
    genReqId: request => ensureTraceId(request),

    // 探活不记；其余全部自动记录（method / url / status / 耗时 / req.id）
    autoLogging: {
      ignore: request => SILENT_PATHS.has((request.url ?? '').split('?')[0] ?? ''),
    },

    serializers: {
      // 白名单：只保留排查必需、且确定不含用户内容的字段。刻意**不含 headers 与 body**。
      req: request => {
        // 见 `StandardSerializedRequest` 的说明：这里的入参是标准序列化器的输出，不是 Express request
        const serialized = request as unknown as StandardSerializedRequest
        return {
          id: serialized.id,
          method: serialized.method,
          url: serialized.url,
          remoteAddress: serialized.remoteAddress,
          userAgent: serialized.headers?.['user-agent'],
        }
      },
      // 响应同样只留状态码：`set-cookie` 之类的响应头一概不进日志
      res: response => ({ statusCode: response.statusCode }),
    },

    /**
     * 5xx 时**去掉 pino-http 自己造的那个占位错误**。
     *
     * 它会在 `statusCode >= 500` 时构造 `new Error('failed with status code 500')` 并塞进访问日志，
     * 栈指向 pino-http 内部 —— 既不是真因，又会与 `ApiExceptionFilter` 记的**真实栈**重复。
     * 验收要求"只有一条带 stack"，保留它就会同时出现两条且其中一条误导。
     *
     * 真实错误（`res` 上的 `error` 事件）仍然保留：只过滤这个合成占位。
     */
    customErrorObject: (_request, _response, error, loggable) => {
      const isSynthetic = error instanceof Error && SYNTHETIC_STATUS_ERROR.test(error.message)
      if (!isSynthetic) return loggable
      return { res: loggable.res, responseTime: loggable.responseTime }
    },

    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },

    // 只有本地开发上 pino-pretty（渲染器）：生产与测试都必须保持 NDJSON ——
    // 采集器要吃"一行一事件"的 JSON，而验收脚本也要靠 JSON 做字段断言
    ...(isLocalDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
  }
}
