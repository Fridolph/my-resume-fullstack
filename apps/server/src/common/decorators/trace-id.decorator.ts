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
 * ## 为什么不用隐式上下文（AsyncLocalStorage 那条路）
 *
 * `nestjs-pino@5.3.1` **包内确实有** `storage`（`AsyncLocalStorage<Store>`，`PinoLogger` 自己也靠它
 * 定位请求级 logger），但它**没有从主入口导出**，`package.json` 的 `exports` 只暴露 `"."`
 * —— 想用它只能走 `nestjs-pino/dist/…/storage.js` 这类内部路径，等于依赖未公开实现，升级即碎。
 *
 * 公开的替代是 `PinoLogger`：`logger.bindings().req?.id` 能读到本次请求 ID
 * （pino-http 用 `child({ req })` 挂请求级 logger，其 `req` 已被白名单序列化器裁剪过）。
 * 但它把两笔成本带进 Service：① **只在请求作用域内有效** —— 脚本 / 定时任务里
 * `storage` 为空会退化成 root logger，静默返回 `undefined`；② Service 从此依赖日志设施，
 * 单测要多造一个 `PinoLogger`。而**显式传参**只多一行，收益是读 controller 就能看出
 * "这个动作会写审计" —— 隐式上下文恰恰会把这件事藏起来。设计推导见
 * `docs/server/09_日志系统_nestjs-pino_设计.md` §4.5 与 `dao/tasks/DAO-044-可观测性-nestjs-pino.md`。
 *
 * ⚠️ 它属于**请求上下文**、不属于身份，所以放在 `common/decorators` 而不是 `auth/decorators`：
 * 未登录的请求（401）也有 `traceId`，它并非鉴权产物。
 */
export const TraceId = createParamDecorator((_data: unknown, context: ExecutionContext): string | undefined => {
  const request = context.switchToHttp().getRequest<Request>()
  return request.traceId
})
