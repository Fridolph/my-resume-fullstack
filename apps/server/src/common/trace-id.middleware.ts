import { randomUUID } from 'node:crypto'
import { Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/** 携带 traceId 的请求头（网关/前端透传它，就能把一次请求在多服务间串起来） */
export const TRACE_ID_HEADER = 'x-request-id'

/**
 * 给每个请求打一个 `traceId`。
 *
 * 为什么放在中间件而不是拦截器：
 * - 中间件在**守卫之前**执行 —— 未授权（401）的请求也已经有了 traceId，日志能串起来；
 * - 拦截器在守卫之后，401 的请求根本走不到它。
 *
 * 优先复用上游传来的 `x-request-id`（网关、前端、其他服务），没有再自己生成；
 * 同时回写到响应头，前端可以在控制台看到本次请求的 id，出问题时报它即可。
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[TRACE_ID_HEADER]
    const traceId = (Array.isArray(incoming) ? incoming[0] : incoming)?.trim() || randomUUID()

    req.traceId = traceId
    res.setHeader(TRACE_ID_HEADER, traceId)
    next()
  }
}
