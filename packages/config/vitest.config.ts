import { defineConfig } from 'vitest/config'

/**
 * `packages/config` 的单元测试（vitest）。
 *
 * 同 `packages/common` / `packages/utils`：测试放 `test/`（不污染 `src`），
 * 并显式 `passWithNoTests: false` —— "没有测试"必须与"测试通过"可区分。
 *
 * 本包只在 **Node 侧**运行（它产出的是 `nuxt.config.ts` 的配置对象），故 environment 为 node。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    passWithNoTests: false,
  },
})
