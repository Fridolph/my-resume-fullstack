import { Controller, Get } from '@nestjs/common'
import { Public } from './auth/decorators/public.decorator'

@Controller()
export class AppController {
  /**
   * 心跳接口。
   *
   * `@Public()` 是必需的 —— 全局 `JwtAuthGuard` 默认保护所有路由，
   * 否则健康检查（容器编排、监控探针）会一直拿到 401 而被判为不健康。
   */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'api', uptime: process.uptime() }
  }
}
