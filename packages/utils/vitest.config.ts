import { defineConfig } from 'vitest/config'

/**
 * `packages/utils` 的单元测试（vitest）。
 *
 * 同 `packages/common`：测试放 `test/`（不污染 `src` → `dist` 的构建），
 * 并显式 `passWithNoTests: false` —— "没有测试"必须与"测试通过"可区分，
 * 否则删掉测试文件也不会让质量门变红。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    passWithNoTests: false,
  },
})
