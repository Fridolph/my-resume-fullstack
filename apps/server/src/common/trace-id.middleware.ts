import { Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { TRACE_ID_HEADER, ensureTraceId } from './trace-id'

// 保持原有导入面：`TRACE_ID_HEADER` 的生成逻辑搬到了 `./trace-id`，
// 这里继续转出，调用点一行都不用改（AGENTS.md §4.6「迁移保留调用面」）。
export { TRACE_ID_HEADER }

/**
 * 给每个请求打一个 `traceId`，并回写到响应头。
 *
 * 为什么放在中间件而不是拦截器：
 * - 中间件在**守卫之前**执行 —— 未授权（401）的请求也已经有了 traceId，日志能串起来；
 * - 拦截器在守卫之后，401 的请求根本走不到它。
 *
 * ⚠️ 生成的**权威**在 `ensureTraceId`（幂等），不在本类里。
 * `pino-http` 的 `genReqId` 调的是同一个函数，因此**两者谁先执行都不影响结果** ——
 * 这正是 DAO-044 那条"顺序不能靠注册顺序猜"的落法：与其选一条顺序并断言，
 * 不如把顺序从契约里去掉（见 `trace-id.ts` 的说明）。
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = ensureTraceId(req)
    res.setHeader(TRACE_ID_HEADER, traceId)
    next()
  }
}
