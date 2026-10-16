import { defineConfig } from 'vitest/config'

// apps/server 的单元测试（vitest）。
// 用 .mts 而不是 .ts：本包 package.json 没有 "type": "module"，.ts 会被当成 CommonJS 加载并告警。
// 测试留在 src/**/__tests__/：本包 tsconfig 是 rootDir: src，放 test/ 会被 tsc 排斥。
// passWithNoTests: false 是刻意的 —— 旧脚本用 node --test，没有匹配文件时仍以 0 退出
//（实测 # tests 0 / # pass 0，Turbo 报 3/3 successful），即测试被删光质量门依然是绿的。
// vitest 直接跑 TS 源码，测试不再依赖 pnpm build 的 dist 产物。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    // ⚠️ 排除需要真实数据库的集成测试：`*.integration.test.ts` 会被上面的 `*.test.ts` 匹配到，
    // 不排除的话 `pnpm test` 就会开始依赖数据库 —— 那会毁掉"单元测试可离线跑"这条性质。
    // 集成测试用 `test:audit:db`（自己的配置）单独跑。
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    passWithNoTests: false,
  },
})
