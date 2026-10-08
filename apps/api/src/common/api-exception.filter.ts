import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Request, Response } from 'express'
import type { ApiErrorBody } from '@template/common'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' && exceptionResponse && 'message' in exceptionResponse
          ? String(exceptionResponse.message)
          : 'Internal server error'
    const body: ApiErrorBody = {
      success: false,
      data: null,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      statusCode: status,
    }
    response.status(status).json(body)
  }
}
