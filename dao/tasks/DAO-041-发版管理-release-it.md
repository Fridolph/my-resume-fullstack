# 【DAO-041】发版管理：release-it + @release-it/conventional-changelog

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`self-tested`（配置与脚本已落地推送；**端到端预演未跑通**，Issue #50 保持开启）
- Owner：`昇哥（2026-10-16：希望添加 @release-it/conventional-changelog 来管理后续发布）`
- 创建日期：`2026-10-16`
- 分支：待建 `chore/50-release-it`
- Issue：[#50](https://github.com/Fridolph/my-resume-fullstack/issues/50)
- 关联：`AGENTS.md` §7「文档、提交与发布」、`docs/dev/01_开发流程_分支与提交.md`

## 目标与边界

- 目标：用 `release-it` + `@release-it/conventional-changelog` 取代 `standard-version`，
  把发版收敛成"可预演、可回滚"的一条命令。
- 范围：根 `package.json` 的脚本与依赖、新配置文件（`.release-it.json`）、删 `.versionrc.json`、README 发版章节。
- 非目标：**不接 CI 自动发版**；**不执行任何真实 push / tag / 发版**；不发布 npm 包。

## 现状（已核实）

| 项 | 事实 |
| --- | --- |
| 现用工具 | `standard-version@^9.5.0`（已归档不再维护） |
| 脚本 | `release` / `release:first` / `release:patch\|minor\|major` / `changelog` |
| 配置 | `.versionrc.json`（header + type→section 映射，共 10 类） |
| 缺口 | 没有 `release:dry` 预演入口；`CHANGELOG.md` 不完整 |

## ⚠️ 依赖变更（按 `AGENTS.md` §2，需 Owner 确认）

| 项 | 内容 |
| --- | --- |
| 新增 | `release-it`、`@release-it/conventional-changelog`（devDependencies） |
| 移除 | `standard-version` |
| 影响 | 发版命令与配置格式变化；**不影响运行时依赖与产物** |
| 最大风险 | release-it **默认会 `git push`**，还可能发布 npm —— 本仓是 `private: true`，但仍必须显式关掉 `git.push`，否则一次误跑就把提交推上去了 |
| 回滚 | 删新依赖与配置、脚本改回 `standard-version`；已生成的 tag / CHANGELOG 需单独处理 |

## 配置硬要求

1. `git.push: false`、npm 发布关闭 —— 把"改文件 / 打 tag"与"推送远端"分开（符合本仓"本地提交 ≠ 已发布"）。
2. `git.requireCleanWorkingDirectory: true`。
3. changelog 的 type→section 映射**沿用** `.versionrc.json`，保证 CHANGELOG 风格不出现断裂。
4. 提供 `release:dry`（预演：不写文件、不打 tag、不推送）。
5. 删 `standard-version` 后清理其残留引用，并更新 `README` 的发版章节。

## 验收标准

1. `pnpm release:dry` 能预演出下个版本号与 CHANGELOG 条目，且**不修改任何文件**。
2. 配置里 `git.push === false` 且发布关闭（可审查确认）。
3. 工作区脏时发版被拒。
4. 仓库无 `standard-version` 残留引用。
5. `pnpm typecheck` / `lint` / `format:check` 全绿。

## 测试计划（按风险）

| 风险 | 验证 |
| --- | --- |
| 误推送 / 误发布 | **本地测试分支**跑 `release:dry`；确认 `git.push:false`；不使用真分支试真发版 |
| CHANGELOG 风格断裂 | dry-run 输出与 `.versionrc.json` 的 section 顺序逐条比对 |
| 版本号语义 | patch / minor / major 各 dry 一次，断言推算结果 |
| 脏工作区 | 故意留一个未提交文件，断言被拒 |

## 交接

- 已完成：现状核实、风险与验收标准、配置硬要求
- 当前状态：`planned`
- 阻塞：等 Owner 确认依赖变更（含"是否本轮就补 `CHANGELOG.md` 并打首个 tag"）
- 下一步第一刀：装依赖 → 写 `.release-it.json`（先关 push）→ 跑 `release:dry` 验证
- 文档锚点：`AGENTS.md` §7、`docs/dev/01_开发流程_分支与提交.md`
- 集成锚点：`待 feature -> dev`

## 收口与沉淀

- `dao-review` 结论：`部分收口` —— 配置/脚本/文档已交付，端到端预演待补
- 最终验证证据：
  - 安全闸**实测生效**：`test/48-vitest` 上跑 `pnpm release:dry` → `ERROR Must be on branch main`；
    工作区有改动 → `ERROR Working dir must be clean`
  - 已核验 `.release-it.json`：`git.push: false` · `npm.publish: false` · `github.release: false` ·
    `requireBranch: main` · `requireCleanWorkingDirectory: true`
  - `scripts/sync-release-notes.mjs` 用候选 CHANGELOG 实测：解析 → 分组 → 生成 → `--check` 全通过
  - `pnpm check` 已纳入 `release-notes:check`
- **未验证（卡点）**：`release-it` 的完整 dry-run 输出（版本推算 + CHANGELOG 生成）未跑通 ——
  临时放开"工作区需干净"后仍被拦，闸门来源未定位。**解除卡点第一步**：工作区干净后在 `main` 上跑 `pnpm release:dry`
- Git / PR：待补
- Dao Commit：`不适用`
- 沉淀候选：`「发版工具的默认行为可能包含 push —— 引入前先关掉」值得作为工具接入的检查项`
- 收口备注：
