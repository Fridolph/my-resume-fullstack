# 【DAO-009】web/admin 统一别名 import（`#layers/<name>` 与 `~`）

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done`
- Owner：`昇哥选定方案 B（Nuxt 官方 #layers/<name>）与范围（web + admin 一起）、并决定先本地合入 dev 再开分支`
- 创建日期：`2026-10-07`
- 关联：`Issue #14`、`DAO-007` / `DAO-008`（展示域与风格维度，均已合入 dev）、`docs/web/03_Layers_分层约定.md` §6、Nuxt 4.5 自动生成的 layer 别名

## 状态轨迹

| 迁移                          | 依据                                                                                                                                                             | 确认者     | 日期       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| `planned -> designed`         | 用 `.nuxt/tsconfig.json` 核实 `~`/`@` 均指向 `app/`（非 layer）、`#layers/<name>` 已由 Nuxt 自动生成；实测自定义 alias 亦可行，`@` 无法按 layer 解析的原因已确认 | 归枢记录   | 2026-10-07 |
| `designed -> in-progress`     | Owner 选定方案 B（不引入自定义别名）+ 范围 web&admin；`feat/13` 先本地 squash 合入 dev（`bdcf584`），再从 dev 开 `feat/14-layers-alias`                          | Owner 确认 | 2026-10-07 |
| `in-progress -> self-tested`  | 64 处替换完成（web 57 / admin 7），两端 typecheck、oxlint、SSR 抓页全部通过                                                                                      | 归枢记录   | 2026-10-07 |
| `self-tested -> review-ready` | 交接包齐全；三个提交（fix / refactor / docs）本地 squash 合入 dev（`0496c4e`），未推远端                                                                         | 归枢记录   | 2026-10-07 |

## Grill：开工前对齐

- 目标：把 layer 内引用自身的相对路径（`../../types/resume` 等）统一改为 Nuxt 官方别名 `#layers/<name>/app/...`，app 层内部统一用 `~/...`；并把别名语义与约束写进 `docs/web/03_Layers_分层约定.md`。
- 边界：只改 import 语句与文档；不改任何功能、样式、layer 划分与依赖方向。
- 不做：不引入自定义别名（如 `@resume`）；不改 Nuxt 自动导入策略（不删可自动导入的 components / composables import）；不动 `packages/common`、`apps/server`。
- 涉及文件 / 模块：`apps/web/layers/11-public-resume/**`（55 处 / 26 文件）、`apps/web/layers/12-ai-talk/**`（0 处）、`apps/admin/app/components/TextEditor/**`（7 处 / 7 文件）、`docs/web/03_Layers_分层约定.md`、`docs/dev/README.md`。
- 风险与未知：① 别名全局可见 → 会削弱「layer 间不得互相 import」的隐性保护，需在文档里补约定；② `#layers/<name>` 依赖 `$meta.name`，若层名改动需同步（tsconfig 会自动重生成）；③ 替换后需两端 SSR 实跑，typecheck 通过不等于运行时解析正常。
- 验收：见 `Issue #14`（两端 typecheck / oxlint / SSR 抓页 / 业务代码内不再有 `../` / 文档记录约定）。
- 第一刀：先落 `docs/web/03_Layers_分层约定.md` 的别名约定，再批量替换。
- 过门判断：`可开工`。

## 设计与决策

| 决策                                                              | 理由 / 证据                                                                                                                                                        | 确认者     | 日期       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------- |
| 用 `#layers/<name>/app/...` 而非自定义短别名                      | Nuxt 4.5 已自动生成该别名（两端 `.nuxt/tsconfig.json` 均可见），零配置、官方机制、不新增约定                                                                       | Owner 确认 | 2026-10-07 |
| **`@` 不做「layer 内指向 layer 自身」**                           | 别名是全局扁平的 `名字 → 目录` 表（Vite 与 `vue-tsc` 共用 tsconfig `paths`），无「按导入文件位置解析」能力；要那样做需自造 Vite 插件 + TS 类型映射，代价远大于收益 | 归枢记录   | 2026-10-07 |
| 文档补「layer 别名不得用于跨层引用」                              | 改别名前，跨层引用写起来别扭（等于有一层隐性保护）；别名全局可见后需靠约定自觉                                                                                     | 归枢记录   | 2026-10-07 |
| admin 的 3 处 sortable 回调改用类型推导，不装 `@types/sortablejs` | 见下：本机 pnpm store 冲突导致 `pnpm add` 不可用；且 TS 的 `@types` 查找不进 `.pnpm/node_modules`，app 直接 `import ... from 'sortablejs'` 必报 TS7016             | 归枢记录   | 2026-10-07 |
| 先本地 squash 合入 `feat/13` 再开新分支                           | 本次要改的 57 处正好落在 `feat/13` 已改过的文件里；先集成可避免冲突                                                                                                | Owner 确认 | 2026-10-07 |

### 过程中发现的既有回归（已一并修）

- `DAO-008` 为 web 引入 `@types/sortablejs` 后，pnpm 把它提升到 `node_modules/.pnpm/node_modules/`，admin 通过 `@vueuse/integrations` 的间接引用也能解析到它 → admin 里 3 处「把 `{oldIndex, newIndex}` 传给期望 `SortableEvent` 的函数」被类型检查抓出（`ColumnSortList.vue`、`resume/ResumeLayoutPanel.vue`、`sortable-bar/SortableBar.vue`）。
- 修法：回调签名改为完整事件类型，`oldIndex/newIndex` 加非空回退；类型用 `NonNullable<Parameters<typeof moveArrayElement>[3]>` 推导 —— 因为 app 直接 `import ... from 'sortablejs'` 会 TS7016（`@types` 不会从 `.pnpm` 内部目录解析），而走 vueuse 的声明可以。
- 环境限制（记录备查）：本机 pnpm 报「node_modules 从 `~/Library/pnpm/store/v10` 链接，但 pnpm 想用项目内 `.pnpm-store/v10`」，`pnpm add` 被拒；`.pnpm-store` 是空的且已被 `.gitignore` 忽略。本次因此未新增任何依赖。

## 执行与验证

| 类型   | 命令 / 样本 / 链接                                                                                      | 结果                                                                                                                                | 仍未验证的边界                                                     |
| ------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 机器验 | `pnpm --filter @rs/web typecheck`；`pnpm --filter @rs/admin typecheck`                      | 均通过（admin 首次曾因上述回归报 3 个错，修正后通过）                                                                               | 全仓 `format:check` 仍是既有缺口（DAO-006）                        |
| 机器验 | `oxlint apps/web`（42 files）、`oxlint apps/admin`（136 files）                                         | 0 warning / 0 error                                                                                                                 | —                                                                  |
| 结构验 | 全仓业务代码 grep `from '../`                                                                           | 0 处残留；替代为 `#layers/public-resume/app/...`（57 处）与 `~/components/TextEditor/...`（7 处）；同目录 `./x` 保留                | —                                                                  |
| 结构验 | 两端 `.nuxt/tsconfig.json` 的别名                                                                       | web：`#layers/public-resume`、`#layers/ai-talk`；admin：`#layers/{resume,projects,teams,settings,comps}`；`~`/`@` 仍指向各自 `app/` | 未验证「层名改动」后的重生成（下次改 `$meta.name` 时留意）         |
| 意图验 | dev server（web `:4023`）：`/resume`                                                                    | 200；`data-resume-style="minimal"`、区块标题齐全、无 `Failed to resolve component` / `NUXT_E*`；`/ai-talk` 200                      | —                                                                  |
| 意图验 | dev server（admin `:4047`）：`/release-notes`（TextEditor 所在页）、`/resume`、`/projects`、`/settings` | 200 / 200 / 200 / 302→`/settings/company`；无解析类报错                                                                             | `/comps` 本身为 404（该 layer 只有子页，无 index），非本次改动导致 |

## 交接

- 已完成：`docs/web/03_Layers_分层约定.md` 补 §6「路径别名与 import 约定」（含 `@` 不能按 layer 解析的原因）；web 57 处 + admin 7 处替换；admin 3 处 sortable 类型回归修复；`docs/dev/README.md` 索引更新。
- 当前状态：`review-ready`（已合入 dev，等 Owner 判 `done`）
- 阻塞：无。
- 下一步第一刀：本卡无下一步（已集成）。若要继续推进，回到 `DAO-008` 遗留的 UI 目视（与 P2 的 `cool` 一起），或 `DAO-005` 的 alova 迁移收尾。
- 文档锚点：`Issue #14`、`docs/web/03_Layers_分层约定.md` §6
- 集成锚点：`已集成（0496c4e，本地 squash 合入 dev，未推远端）`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：`见上表（两端 typecheck / oxlint / SSR 抓页）`
- Git / PR：`本地 squash，无 PR：0496c4e`
- 常规提交：`a4a5666（fix）/ 85d572b（refactor）/ d85d02b（docs）`
- Dao Commit：`不适用`
- 沉淀候选：`候选观察` —— 「alias 方案要按『能否表达自身语义』选：Nuxt 的 `@`/`~` 是全局扁平表，无法表达『layer 内指向自身』；官方 `#layers/<name>` 才是正确机制」。这条与框架无关的教训（任何 bundler 的 alias 都是扁平表）可能在 React 版需要重新踩一次（Vite alias / tsconfig paths 同样限制），值得观察。
- 收口备注：本次顺带暴露一个**跨 app 的隐性耦合**——一个 app 新增 devDependency 的类型包会被 pnpm 提升，从而改变另一个 app 的类型检查结果。以后在 web 加 `@types/*` 时，要注意 admin 是否也会被波及。

## 收口记录（2026-10-08）

- 状态 `review-ready -> done`：交付已合入 `dev`（见「交接 → 集成锚点」），验证证据与未验证边界均在本卡内可查。
- 依据：Owner 于 2026-10-08 要求「任务完成后立即检查并收口 Issue 与任务卡，避免积累」，据此判 `done`。
  卡内已如实标注的未验证边界（如浏览器目视、端到端交互）**不阻塞收口**，另行统一安排。
