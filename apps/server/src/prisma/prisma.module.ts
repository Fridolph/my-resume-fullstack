import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/**
 * 数据库访问模块。
 *
 * 标 `@Global()` 是**刻意的例外**：数据库连接是全应用共享的基础设施，
 * 若每个模块都要写 `imports: [PrismaModule]`，那些行只是噪音、不表达任何边界。
 *
 * 判据：**是否全应用唯一、且不承载业务语义** —— 是，就 `@Global()`；
 * 不是（例如 `AuthModule`、将来的 `UsersModule`），就别 Global。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
