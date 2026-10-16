import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

/**
 * 取本次请求的 `traceId`：
 *
 * ```ts
 * @Delete(':id')
 * remove(@Param('id') id: number, @TraceId() traceId: string) { … }
 * ```
 *
 * ## 为什么需要它（而不是让 Service 自己拿）
 *
 * 审计行要带 `requestId` 才能和访问日志串起来（"这次删除对应哪条请求"）。
 * 这个值由 `TraceIdMiddleware` 写在 `req.traceId` 上，**Service 手上只有 `AuthUser`，拿不到它**。
 *
 * 为什么不引入 AsyncLocalStorage 之类的隐式上下文：`nestjs-pino@5.3.1` 并没有导出
 * 可用的 `storage`（实测导出清单里没有它）。而**显式传参**的代价很小、收益是可读性 ——
 * 读 controller 就能看出"这个动作会写审计"，隐式上下文反而会把它藏起来。
 *
 * ⚠️ 它属于**请求上下文**、不属于身份，所以放在 `common/decorators` 而不是 `auth/decorators`：
 * 未登录的请求（401）也有 `traceId`，它并非鉴权产物。
 */
export const TraceId = createParamDecorator((_data: unknown, context: ExecutionContext): string | undefined => {
  const request = context.switchToHttp().getRequest<Request>()
  return request.traceId
})
