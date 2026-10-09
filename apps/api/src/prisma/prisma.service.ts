import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

/**
 * Prisma 的 Nest 封装。
 *
 * ## 为什么必须传 adapter（Prisma 7 的行为变化）
 *
 * v7 移除了 Rust 查询引擎，client 变成**纯 TypeScript 实现**：不传 driver adapter，
 * `new PrismaClient()` 会直接抛 `requires either adapter or accelerateUrl`。
 * 于是连接串在项目里出现两次，各有明确职责：
 * - `prisma.config.ts` 的 `datasource.url` → **CLI 用**（migrate / studio）；
 * - 这里的 `PrismaPg({ connectionString })` → **运行时用**。
 * 这不是重复配置，是 v7 的有意设计。
 *
 * ## 为什么在 `onModuleInit` 里连
 *
 * 不在这里连，"库连不上"要等第一个请求才暴露，那时错误会混在业务日志里、而且看不出是启动期问题。
 * 启动阶段显式 `$connect()`，配置错就直接启动失败 —— 与 `config/env.validation.ts` 同一个思路：
 * **能提前发现的错误，不要留到运行时。**
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor(private readonly configService: ConfigService) {
    // `super()` 必须在访问 `this` 之前调用，所以这里直接用参数（不能写 this.configService）
    super({
      adapter: new PrismaPg({ connectionString: configService.getOrThrow<string>('DATABASE_URL') }),
    })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
    this.logger.log('数据库已连接')
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
