import { randomUUID } from 'node:crypto'

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
 * **全仓唯一的 traceId 生成处**，且**幂等**。
 *
 * ## 为什么是"幂等"而不是"排好顺序"
 *
 * 接入 `pino-http` 之前，`traceId` 由 `TraceIdMiddleware` 生成，并流向**三处**：
 * 日志、响应头 `x-request-id`、响应体 `traceId`。而 `pino-http` 也**自带** ID 生成
 * （`genReqId`）—— 于是"谁先生成"变成了一个必须回答的问题。
 *
 * DAO-044 卡给的两条路是「中间件生成、Pino 读」或「Pino 生成、中间件读」，
 * 并要求"选一条并断言，**不能靠注册顺序猜**"。
 *
 * 这里选了**第三条、也是更彻底的一条**：把生成逻辑收敛成一个幂等函数，
 * **两个调用方都调用它**，谁先到谁生成、后到的读到同一个值 ——
 * 于是"Nest 中间件先执行还是 pino-http 先执行"**不再是契约**，也就不必去断言顺序。
 * （顺序依赖是隐式契约；能消除就不要靠测试去钉住它。）
 *
 * 仍然只有一个生成处：本函数里的 `randomUUID()`。
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
