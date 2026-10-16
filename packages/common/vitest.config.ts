import { defineConfig } from 'vitest/config'

/**
 * `packages/common` 的单元测试（vitest）。
 *
 * ## 为什么测试在 `test/` 而不是 `src/`
 *
 * 本包的 tsconfig 是 `rootDir: "src"` + `outDir: "dist"`：把测试放进 `src/` 会被打进产物。
 * 所以测试独立在 `test/`，由本配置显式纳入。
 *
 * ## 为什么设 `passWithNoTests: false`
 *
 * 这是本轮修复的核心之一 —— 旧脚本是 `node --test test/__tests__/*.test.mjs`，
 * **没有匹配文件时 `node --test` 仍以 0 退出**：实测 `# tests 0 / # pass 0`，
 * 而 Turbo 报 `3/3 successful`。也就是说**测试被删光，质量门依然是绿的**。
 * 显式关掉"无测试也算通过"，让"没有测试"和"测试通过"变成两件可区分的事。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    passWithNoTests: false,
  },
})
