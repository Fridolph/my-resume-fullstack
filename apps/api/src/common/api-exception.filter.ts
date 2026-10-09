import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { createApiErrorBody } from '@template/common'
import type { Request, Response } from 'express'
import { API_ERROR_CODES, inferErrorCode } from './error-codes'

/**
 * 全局异常过滤器 —— **只有一个 `@Catch()`**。
 *
 * 参考项目按异常类型分了三个（`@Catch()` / `@Catch(HttpException)` / `@Catch(UnauthorizedException)`），
 * 结果 401 与 500 的输出形状不同，前端要写两套解析。原因很直接：
 * Nest 的过滤器**具体优先于泛化**，`@Catch(UnauthorizedException)` 会把本该由统一过滤器处理的分支抢走。
 * 想要"唯一契约"，出口就只能有一个。
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const { message, errorCode } = describeException(exception, status)
    const traceId = request.traceId
    const where = `[${traceId ?? '-'}] ${request.method} ${request.url} → ${status}`

    // 5xx 是"我们这边的问题"，要带堆栈；4xx 是调用方的问题，记一行足够 —— 否则日志会被 401 淹没
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${where} ${message}`, exception instanceof Error ? exception.stack : undefined)
    } else {
      this.logger.warn(`${where} ${message}`)
    }

    // 用 originalUrl：request.url 在 setGlobalPrefix('api') 下不含前缀，
    // 而前端排查时要看到的是"浏览器里那条路径"（/api/auth/me 而不是 /auth/me）
    response
      .status(status)
      .json(
        createApiErrorBody({
          message,
          statusCode: status,
          path: request.originalUrl ?? request.url,
          errorCode,
          traceId,
        }),
      )
  }
}

/**
 * 从异常里取出「给用户看的一句话」与「机器可读的错误码」。
 *
 * 错误码来源有两处，优先显式声明的：
 * 1. 业务里 `throw new UnauthorizedException(msg, { errorCode })` —— Nest 12 会把 `errorCode`
 *    带进 `getResponse()` 的 body（`HttpExceptionOptions.errorCode`，见 `@nestjs/common` 类型定义）；
 * 2. 没声明时按状态码兜底（`inferErrorCode`），保证前端**永远**拿得到 `errorCode`，不必写 `?? 'unknown'`。
 */
function describeException(exception: unknown, status: number): { message: string; errorCode: string } {
  if (exception instanceof HttpException) {
    const body = exception.getResponse()

    const explicitCode =
      typeof body === 'object' && body !== null && 'errorCode' in body
        ? (body as { errorCode?: string }).errorCode
        : undefined

    // class-validator 校验失败时 message 是字符串数组，取第一条；
    // 前端按 errorCode 分支，这条文案只是给人看的提示
    const rawMessage = typeof body === 'string' ? body : (body as { message?: string | string[] }).message
    const message = Array.isArray(rawMessage) ? (rawMessage[0] ?? '请求参数不合法') : (rawMessage ?? exception.message)

    return { message, errorCode: explicitCode ?? inferErrorCode(status) }
  }

  // 非 HttpException（真正的意外）：**不把内部错误信息透给调用方**，只给稳定文案 + 兜底码，
  // 细节留在上面那条 error 日志里（配合 traceId 定位）
  return { message: '服务器内部错误', errorCode: API_ERROR_CODES.INTERNAL_ERROR }
}
