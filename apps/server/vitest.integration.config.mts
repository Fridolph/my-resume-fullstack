import { defineConfig } from 'vitest/config'

// 需要真实数据库的集成测试（审计表的无级联 / 事务回滚）。
// **刻意与默认配置分开**：`pnpm test` 必须无依赖、可离线跑；
// 这一份只在显式授权时通过 `test:audit:db` 使用。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.integration.test.ts'],
    passWithNoTests: false,
    // 集成测试会动数据库，串行跑避免互相干扰
    fileParallelism: false,
  },
})
