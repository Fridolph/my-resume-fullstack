import { ConfigService } from '@nestjs/config'
import { BadRequestException, StandardSchemaValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Logger } from 'nestjs-pino'
import { API_ERROR_CODES } from './common/error-codes'
import { join } from 'node:path'
import { AppModule } from './app.module'

async function bootstrap() {
  // `bufferLogs: true` 是关键：pino 就绪之前的启动日志先缓冲，等 `useLogger` 之后统一由 pino 输出。
  // 不写它，那几行会用 Nest 默认 Logger 打印 —— 于是启动日志里混进一批没有 reqId、也没结构的字符串。
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false })

  // 把日志出口交给 pino：此后 `new Logger()`（Nest 的）与 pino 是同一条管道，
  // 且请求内产生的日志会自动带上该请求的 reqId（pino-http 的 child logger + AsyncLocalStorage）。
  app.useLogger(app.get(Logger))

  app.useBodyParser('json', { limit: '128kb' })
  app.useBodyParser('urlencoded', { extended: true, limit: '128kb' })
  // 统一从 ConfigService 读配置（已过 `config/env.validation.ts` 的校验），
  // 避免各处直接摸 process.env —— 那样校验形同虚设
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')

  /**
   * 上传文件的静态服务：`/static/upload/**` → `apps/server/static/upload/**`。
   *
   * **公开可读**（Owner 2026-10-15）：简历封面、头像本来就要给访客看。
   * 若将来出现私密文件，另开 `GET /api/file/:id`（带鉴权）而不是收紧这条 ——
   * 两种语义混在同一个前缀上，会让"哪些文件是公开的"变得说不清。
   *
   * 路径用 `process.cwd()` 而不是 `__dirname`：dev（ts-node / nest start）与生产（`dist/main`）
   * 的工作目录都是包根，而 `__dirname` 会随构建产物位置漂移。
   */
  app.useStaticAssets(join(process.cwd(), 'static'), { prefix: '/static/' })

  // CORS 白名单：**只有** `CORS_ORIGINS` 里列出的来源会被放行。
  //
  // 不传参（`enableCors()`）等价于 `Access-Control-Allow-Origin: *` —— 任何站点都能读到
  // 本接口的响应；配上公开读接口，等于谁都能跨站把全部简历抓走。白名单是这条的上游闸门。
  //
  // 两个刻意之处：
  // 1. `exposedHeaders` 不是装饰：浏览器**默认不允许**脚本读取非"简单响应头"，
  //    `x-request-id` 正属于后者。不给它开洞，前端就拿不到 traceId ——
  //    「请求头 ID == 日志 ID == 响应头 ID == 响应体 traceId」在浏览器里只剩三处可见。
  // 2. **没有** `credentials: true`：token 走 `Authorization: Bearer`，且服务端
  //    **没有任何 cookie 解析**（跨域 cookie 才需要 credentials）。若将来改成跨域 cookie 鉴权，
  //    必须同时加 `credentials: true` —— 而且那时 `origin` 就更不能放宽了。
  app.enableCors({
    origin: config.get<string[]>('CORS_ORIGINS') ?? [],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
    maxAge: 600,
  })

  // 入参校验：Nest 12 的 Standard Schema 管道（schema 挂在 `@Body({ schema })` 上）。
  // 用它而不是 class-validator：校验规则与 TS 类型同源（`z.infer`），且 `z.object()` 默认 strip
  // 未声明字段（等价于旧 `ValidationPipe({ whitelist: true })` 的防注入）。
  // 详细约定见 docs/server/01_API_约定.md §3.1。
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      // 校验后返回 schema 的转换结果（Zod 的 coerce / 默认值在此生效）
      transform: true,
      // 默认实现抛的是 BadRequestException(string[])、不带 errorCode；
      // 这里给一个带项目错误码的异常，前端仍然按 errorCode 分支
      exceptionFactory: issues => {
        const messages = issues.map(issue => {
          const path = issue.path
            ?.map(segment => String(typeof segment === 'object' && segment !== null ? segment.key : segment))
            .join('.')
          return path ? `${path}: ${issue.message}` : issue.message
        })

        return new BadRequestException(messages[0] ?? '请求参数不合法', {
          errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        })
      },
    }),
  )

  await app.listen(config.get<number>('PORT') ?? 4049, '0.0.0.0')
}

void bootstrap()
