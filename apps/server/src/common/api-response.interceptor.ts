import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common'
import { createApiResponse } from '@rs/common'
import type { Request } from 'express'
import type { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/**
 * 把控制器返回值包成**统一成功响应**。
 *
 * 它只做"包壳"一件事，形状由 `@rs/common` 的 `createApiResponse` 决定 ——
 * 与失败响应共用同一份契约。若在这里另改一套形状，前端就又得分两套解析，
 * 那正是参考项目 `common/` 里 4 套格式并存的老路。
 *
 * `traceId` 来自中间件（挂在 `req` 上），成功响应也带上它，便于"用户报错 → 按 id 查日志"。
 * `timestamp` 由 createApiResponse 在组装响应时生成，为 ISO 8601 UTC 字符串；
 * 它表示服务端生成响应的时间，不是请求开始时间，成功与失败使用相同格式。
 */
@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>()

    // 这里只负责"成功"的形状（code = 200）；失败一律走 ApiExceptionFilter。
    // 两个出口共用 `@rs/common` 的同一份契约 —— 这就是"唯一形状"的落地方式。
    // 文件由 Nest 的流适配器处理，不能被 JSON 成功壳吞掉；异常仍走统一过滤器。
    return next
      .handle()
      .pipe(
        map(data =>
          data instanceof StreamableFile ? data : createApiResponse(data, 'ok', { traceId: request.traceId }),
        ),
      )
  }
}
