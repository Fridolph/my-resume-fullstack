# 【DAO-039】测试体系：vitest 接入 + resume.service 测试转 TS + 堵住「0 测试也全绿」

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done`（2026-10-16 完成，已合入 dev 并推送）
- Owner：`昇哥（2026-10-16：那留着吧，改为 resume.service.test.ts，可以加入 vitest；admin 和 web 暂不添加单元测试，但 packages 这些是公共的可以添加）`
- 创建日期：`2026-10-16`
- 分支：待建 `test/48-vitest`
- Issue：[#48](https://github.com/Fridolph/my-resume-fullstack/issues/48)
- 关联：`DAO-002`（历史同类问题：质量任务的构建依赖）、`docs/dev/05_全栈简历项目_DAO028学习复盘.md` §18.5

## 目标与边界

- 目标：引入 vitest；`resume.service.test.cjs` → **`.ts` 且直接 import 源码**（不再依赖 `dist`）；
  **测试为零时质量门失败**。
- 范围：`apps/server` + `packages/*`。`apps/admin` / `apps/web` **明确不加**单元测试。
- 非目标：不引入 e2e 框架；不改两端（Nuxt 应用）的测试脚本。

## 现状（已核实）

| 项 | 事实 |
| --- | --- |
| 测试运行器 | `node --test`（server 用 `.cjs`、common 用 `.mjs`） |
| server 测试入口 | `pnpm build && node --test src/resume/__tests__/*.test.cjs` —— **依赖构建产物** |
| 既有断言 | 4 组：权限拒绝先于数据库访问 / 所有权与账号可用性过滤 / 条件更新冲突 / 物理删除 |
| ⚠️ 真实缺口 | 测试文件缺失时 `node --test` **仍以 0 退出**：实测 `# tests 0 / # pass 0`，Turbo 报 3/3 successful |

## 依赖变更（按 `AGENTS.md` §2，需 Owner 确认）

| 项 | 内容 |
| --- | --- |
| 新增 | `vitest`（devDependency） |
| 影响 | server 与 common 的 `test` 脚本、Turbo `test` 任务图；**不影响运行时与产物** |
| 回滚 | 移除 vitest、脚本改回 `node --test`；测试文件从 git 恢复 |
| 需确认 | 装在根还是各包；是否顺带把 common 的 `node --test`（`.mjs`）一并统一 |

## 验收标准

1. 临时移走测试文件时 `pnpm test` **非 0 退出**（可演示）。
2. `resume.service.test.ts` 删掉 `dist/` 后仍能跑通（证明不再依赖构建产物）。
3. `packages/common` 既有 22 个测试继续通过；新增测试有真实断言。
4. `pnpm typecheck` / `lint` / `format:check` 全绿。

## 测试计划（按风险）

| 风险 | 验证 |
| --- | --- |
| 测试仍隐式依赖 `dist` | 删 `dist` 后重跑 |
| 测试为零静默通过 | 移走测试文件，断言退出码 ≠ 0 |
| Turbo 任务图被破坏 | 干净环境 `pnpm test`（不因缺 `dist` 失败） |

## 交接

- 已完成：问题盘点、现状核实、验收标准与风险
- 当前状态：`planned`
- 阻塞：等 Owner 确认依赖变更（装哪、版本、是否统一 common）
- 下一步第一刀：装 vitest → 迁移 `resume.service.test.ts` → 堵住「0 测试全绿」
- 文档锚点：`docs/dev/05_全栈简历项目_DAO028学习复盘.md` §18.5
- 集成锚点：`待 feature -> dev`

## 收口与沉淀

- `dao-review` 结论：`自测通过，收口`（机器可验证项，按 AGENTS.md §4 分层可自行提交）
- 最终验证证据：
  - `pnpm test` → **4 successful / 4 total**；`@rs/utils` 3 文件 **87 例**、`@rs/common` 2 文件 **22 例**、
    `@rs/server` 1 文件 **4 例**（合计 **113 例**，此前为 0）
  - **零测试必须失败**：移走测试文件 → 退出码 **1**（`No test files found`）；恢复 → 通过
  - **不再依赖构建产物**：移走各包 `dist/` 后测试仍全绿
  - `pnpm check` 全绿（format 335 文件 / lint 305 文件 0 error / typecheck 8/8 / test 113 例）
- Git / PR：待补
- Dao Commit：`不适用`
- 沉淀候选：`「质量门必须能区分『通过』与『没有测试』」——若第二个项目复现同样问题，值得考虑归母`
- 收口备注：
