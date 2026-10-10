import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import { UserModule } from './user/user.module'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { ApiExceptionFilter } from './common/api-exception.filter'
import { ApiResponseInterceptor } from './common/api-response.interceptor'
import { TraceIdMiddleware } from './common/trace-id.middleware'
import { validateEnv } from './config/env.validation'

/**
 * 应用根模块。三个全局 provider 的顺序，就是一次请求要走过的链：
 *
 * ```text
 * ConfigModule（先校验环境变量：缺 JWT_SECRET / DATABASE_URL 直接启动失败）
 * TraceIdMiddleware（中间件，最先 —— 这样连 401 的请求也有 traceId）
 *   → JwtAuthGuard（守卫：默认要求登录，@Public() 才放行）
 *     → 控制器
 *       → ApiResponseInterceptor（成功：包成统一响应体）
 *         ↳ 抛异常 → ApiExceptionFilter（失败：包成同形状的错误体）
 * ```
 *
 * 用 `APP_GUARD` / `APP_INTERCEPTOR` / `APP_FILTER` 注册，而不是 `app.useGlobalXxx()`：
 * 前者能走**依赖注入**（守卫需要 `AuthService`、过滤器需要日志），后者只能传实例、拿不到容器。
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      // 启动时校验：缺关键变量直接失败并指名道姓，而不是等到运行时给出费解的症状
      validate: validateEnv,
      cache: true,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdMiddleware).forRoutes('*')
  }
}
