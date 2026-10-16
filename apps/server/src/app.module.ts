import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import { UserModule } from './user/user.module'
import { ResumeModule } from './resume/resume.module'
import { AuditModule } from './audit/audit.module'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { ApiExceptionFilter } from './common/api-exception.filter'
import { ApiResponseInterceptor } from './common/api-response.interceptor'
import { buildPinoHttpOptions } from './common/logging.config'
import { TraceIdMiddleware } from './common/trace-id.middleware'
import { validateEnv } from './config/env.validation'

/**
 * 应用根模块。三个全局 provider 的顺序，就是一次请求要走过的链：
 *
 * ```text
 * ConfigModule（先校验环境变量：缺 JWT_SECRET / DATABASE_URL 直接启动失败）
 * LoggerModule（pino-http：访问日志 + 请求级 child logger）
 * TraceIdMiddleware（中间件，最先 —— 这样连 401 的请求也有 traceId）
 *   → JwtAuthGuard（守卫：默认要求登录，@Public() 才放行）
 *     → 控制器
 *       → ApiResponseInterceptor（成功：包成统一响应体）
 *         ↳ 抛异常 → ApiExceptionFilter（失败：包成同形状的错误体）
 * ```
 *
 * 用 `APP_GUARD` / `APP_INTERCEPTOR` / `APP_FILTER` 注册，而不是 `app.useGlobalXxx()`：
 * 前者能走**依赖注入**（守卫需要 `AuthService`、过滤器需要日志），后者只能传实例、拿不到容器。
 *
 * ## 关于 traceId 的执行顺序
 *
 * `LoggerModule` 与 `TraceIdMiddleware` 都会碰请求 ID，**但"谁先执行"不是契约** ——
 * 两者都调幂等的 `ensureTraceId`（见 `common/trace-id.middleware.ts`）：谁先到谁生成，后到的读到同一个值。
 * 所以这里**不需要**靠注册顺序来保证一致性，也没有第二个生成处。
 *
 * ## ⚠️ `LoggerModule` 只在根模块注册一次
 *
 * 重复注册会让同一个请求被记两遍。这条与 `docs/learn/B2.md` §六「基础模块避免重复初始化」
 * 是同一个问题。
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
    LoggerModule.forRootAsync({
      // ConfigModule 是全局的，直接 inject 即可；不必再 imports 一次
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: buildPinoHttpOptions({
          // 已过 validateEnv，这几个键一定有值；`?? ` 只是给类型收窄用
          nodeEnv: config.get<string>('NODE_ENV') ?? 'development',
          level: config.get<string>('LOG_LEVEL') ?? 'info',
          // 本地文件日志：默认跟随环境（development 开），可用 LOG_FILE_ENABLED 覆盖
          fileEnabled: config.get<boolean>('LOG_FILE_ENABLED') ?? false,
          fileDir: config.get<string>('LOG_FILE_DIR') ?? 'logs',
        }),
      }),
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    ResumeModule,
    AuditModule,
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
