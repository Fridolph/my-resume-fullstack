import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt'
import type { ExpiresInLiteral } from '../config/env.validation'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'

/**
 * 鉴权模块。
 *
 * ## 密钥没有兜底默认值（刻意如此）
 *
 * 参考项目里写的是 `secretOrKey: config.get('JWT_SECRET') || 'wwzhidao-secret-key'`：
 * 本地跑起来方便，但**一旦忘了配环境变量，生产就会用一个人人可见的密钥签发 token** ——
 * 这类问题不报错、不告警，只是静默地不安全。
 * 这里改成"拿不到就让服务启动失败"，把配置错误拦在部署阶段（配合 `config/env.validation.ts`）。
 *
 * `expiresIn` 给了默认值 `2h`：它不是敏感项，且过期时间长短属于策略而非密钥，
 * 留默认值不影响安全边界，写进 env 只是为了便于按环境调整。
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET')?.trim()
        if (!secret) {
          throw new Error('缺少环境变量 JWT_SECRET：请在 .env 中配置（参考 .env.example）。不使用默认密钥是有意为之。')
        }

        // `expiresIn` 在 @nestjs/jwt@12 里的类型是 ms 库的 `StringValue`（形如 "2h"），不是任意 string。
        // 格式已由 `env.validation.ts` 的 `EXPIRES_IN_PATTERN` 与 `ExpiresInLiteral` 保证 → 这里断言即可。
        const expiresIn = config.get<ExpiresInLiteral>('JWT_EXPIRES_IN') ?? '2h'

        return {
          secret,
          signOptions: { expiresIn: expiresIn as JwtSignOptions['expiresIn'] },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // 导出 JwtModule 与 AuthService：后续模块若需要"签发/解析 token"（如刷新令牌）可直接注入
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
