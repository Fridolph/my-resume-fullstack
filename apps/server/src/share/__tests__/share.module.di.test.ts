import assert from 'node:assert/strict'
import { ThrottlerModule } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import { test } from 'vitest'
import { PrismaModule } from '../../prisma/prisma.module'
import { PrismaService } from '../../prisma/prisma.service'
import { ShareController } from '../share.controller'
import { ShareModule } from '../share.module'
import { ShareService } from '../share.service'

/**
 * 依赖装配的冒烟测试。
 *
 * ## 为什么需要它
 *
 * 跨模块注入失败（`Nest can't resolve dependencies of ShareService`）**typecheck 完全抓不到** ——
 * 类型是对的，只是模块没把 provider 导出来。这种错误只有**启动应用**才会暴露，
 * 而按本仓约定 AI 不自行起服务 ⇒ 不写这条测试就等于把"启动即崩"留给 Owner 去发现。
 *
 * 2026-10-19 实际发生过：`ShareModule` 导入了 `ResumeModule`，但 `ResumeModule`
 * **没有 `exports`**，服务一起就抛 `UnknownDependenciesException`。
 *
 * ## 为什么要手动 import `PrismaModule`
 *
 * 它在应用里是 `@Global()`，但那依赖 `AppModule` 的装配；单独编 `ShareModule` 时全局模块
 * 并不在图上。把真实模块显式放进 `imports` 再**只把 `PrismaService` 换成桩**，
 * 既覆盖了真实依赖图，又不会去连数据库（`PrismaService` 的构造函数会建 pg adapter，
 * 且它依赖 `ConfigService`）。
 *
 * ## 为什么只 `compile()` 不 `init()`
 *
 * `compile()` 会实例化所有 provider（依赖是否齐全当场就知道），但**不跑** `onModuleInit` ——
 * 因此不会 `$connect()`。测试只需证明"装配图是完整的"。
 */
test('ShareModule 的依赖能全部解析（跨模块 provider 缺失只有启动才暴露）', async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      PrismaModule,
      // `ShareController` 上挂了 `@UseGuards(ShareThrottlerGuard)`，而它要 Throttler 的选项。
      // 应用里这些选项由 `AppModule` 的 `ThrottlerModule.forRootAsync` 提供，
      // 单独编 `ShareModule` 时同样不在图上 —— 这里给一份最小配置即可。
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
      ShareModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue({})
    .compile()

  assert.ok(moduleRef.get(ShareService), 'ShareService 应可实例化')
  assert.ok(moduleRef.get(ShareController), 'ShareController 应可实例化')

  await moduleRef.close()
})
