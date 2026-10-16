import { randomUUID } from 'node:crypto'
import { Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/**
 * 请求 ID（traceId）的**全部**逻辑：唯一生成处 + 回写响应头的中间件。
 *
 * ## 为什么生成函数与中间件放在同一个文件
 *
 * 它们服务的是同一件事，而且**必须同时正确才有意义**：
 * 生成函数保证"一个请求只有一个 ID"，中间件保证"这个 ID 会回写给调用方"。
 * 早期版本把生成函数拆到 `trace-id.ts`，结果是三个文件互相 import（本文件、`logging.config.ts`、单测）
 * 却换不来任何独立性 —— 生成函数唯一的调用场景就是"给请求定 ID"。
 * 合并后：**导入一处，读到全部**。
 *
 * ## ⚠️ 本文件的中心设计：生成是**幂等**的，不是"排好顺序"
 *
 * 接入 `pino-http` 之前，`traceId` 由中间件生成，并流向**三处**：日志、响应头 `x-request-id`、
 * 响应体 `traceId`。而 `pino-http` 也**自带** ID 生成能力（`genReqId`）——
 * 于是"谁先生成"变成了一个必须回答的问题。
 *
 * DAO-044 卡给的两条路是「中间件生成、Pino 读」或「Pino 生成、中间件读」，
 * 并要求"选一条并断言，**不能靠注册顺序猜**"。
 *
 * 这里选了**第三条、也是更彻底的一条**：把生成收敛成幂等函数，
 * **两个调用方都调用它**（本中间件 + `pino-http` 的 `genReqId`），
 * 谁先到谁生成、后到的读到同一个值 —— 于是"Nest 中间件先执行还是 pino-http 先执行"
 * **不再是契约**，也就不必去断言顺序。
 *
 * > 判据：**顺序依赖是隐式契约；能消除就不要靠测试去钉住它。**
 * > 把"谁先"换成"谁先都一样"，后者不随框架版本或模块注册写法漂移。
 *
 * 全仓仍然只有一个生成处：`ensureTraceId` 里的 `randomUUID()`。
 */

/** 携带 traceId 的请求头（网关/前端透传它，就能把一次请求在多服务间串起来） */
export const TRACE_ID_HEADER = 'x-request-id'

/**
 * `ensureTraceId` 需要的最小请求形状。
 *
 * 刻意不用 Express 的 `Request`：一是让这个纯函数**不必依赖 Express 类型就能单测**
 * （传一个 `{ headers: {} }` 即可），二是把"它究竟用了请求的哪几个字段"写死在类型上 ——
 * 以后有人想在这里读 body 或 user，类型会先拦住。
 */
export interface TraceIdCarrier {
  /** 由本函数写入；已存在时直接复用 */
  traceId?: string
  headers: Record<string, string | string[] | undefined>
}

/**
 * 取到本次请求的 traceId —— **全仓唯一的生成处**，且**幂等**。
 *
 * 幂等是这里的**契约**（不只是实现细节）：正因为重复调用返回同一个值，
 * `TraceIdMiddleware` 与 `pino-http` 的 `genReqId` 才能都调它而不产生分叉，
 * "谁先执行"才得以从契约里消失。单测专门钉住了这条性质。
 *
 * ## 上游透传
 *
 * 优先复用上游传来的 `x-request-id`（网关、前端、其他服务），没有再自己生成。
 * 空串 / 纯空白视为没传 —— 否则一个 `x-request-id: ` 会让全链路共用一个空 ID。
 *
 * @param req 至少含 `headers` 的请求对象；本函数会就地把结果写回 `req.traceId`。
 * @returns 本次请求的 traceId，非空。
 */
export function ensureTraceId(req: TraceIdCarrier): string {
  if (req.traceId) return req.traceId

  const incoming = req.headers[TRACE_ID_HEADER]
  const fromUpstream = (Array.isArray(incoming) ? incoming[0] : incoming)?.trim()
  const traceId = fromUpstream || randomUUID()

  req.traceId = traceId
  return traceId
}

/**
 * 给每个请求打一个 `traceId`，并回写到响应头。
 *
 * 为什么放在中间件而不是拦截器：
 * - 中间件在**守卫之前**执行 —— 未授权（401）的请求也已经有了 traceId，日志能串起来；
 * - 拦截器在守卫之后，401 的请求根本走不到它。
 *
 * ⚠️ 生成的**权威**在 `ensureTraceId`，不在本类里；本类只负责"回写响应头"这一件事。
 * 即使本中间件与 `pino-http` 的执行顺序改变，日志 / 响应头 / 响应体三处的 ID 也不会分叉。
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = ensureTraceId(req)
    res.setHeader(TRACE_ID_HEADER, traceId)
    next()
  }
}
