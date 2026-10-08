# 【DAO-005】建立 my-resume Nuxt 实现场的基础设施骨架

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`in-progress`
- Owner：`昇哥确认目标、项目转型与三项选型；归枢协作执行`
- 创建日期：`2026-10-07`
- 关联：`dao/CURRENT.md`、`dao/tasks/DAO-006-统一全仓格式化基线.md`、`.dao/inheritance.md`、`.dao/context.md`、`docs/dev/layers.md`、`docs/dev/data-layer.md`、外部蓝图 `my-resume/docs/rs/`（三份）、`my-resume/apps/server`（旧后端对照）

## 状态轨迹

每次迁移只写“为什么能过这一门”的最少依据，不写流水日志。

| 迁移                      | 依据                                                                                                         | 确认者     | 日期       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- | ---------- |
| `planned -> designed`     | Owner 已确认项目转型为 my-resume 的 Nuxt 实现场、数据层用 `@pinia/colada` 替换 alova、第一刀先立基础设施骨架 | Owner 确认 | 2026-10-07 |
| `designed -> in-progress` | Owner 已确认三项选型（领域模型按 rs 蓝图重设计、Prisma、Redis 承担会话/限流/队列），编码前确认门已完成       | Owner 确认 | 2026-10-07 |

## Grill：开工前对齐

- 目标：在本仓建立“逐模块开发”的基础设施骨架——Nuxt 4 layers 业务域分层约定、`@pinia/colada` 数据层、NestJS + PostgreSQL + Redis 的最小可跑后端，以及一条可验证的鉴权闭环，使后续模块能在同一套约定下增量实现。
- 边界：只做骨架、约定与最小闭环；前端改 `apps/admin`、`apps/web` 的基础设施与分层，后端改 `apps/api` 的基础设施与 `auth` 模块。
- 不做：不实现具体业务页面（resume 编辑 / 发布 / AI 能力另立任务卡）；不迁移 my-resume 的 AI / RAG 能力，不引入 Milvus / Neo4j / LangGraph；不删除或改写 my-resume 旧仓；不一次性铺满所有 layer；本轮不把 Redis 用作缓存层。
- 涉及文件 / 模块：`apps/web`、`apps/admin`（`layers/`、`plugins/`、`composables/`、`apis/`、`lib/`、`utils/`、`types/`、`nuxt.config.ts`、`package.json`）、`apps/api`（`src/common`、`src/config`、`src/database`、`src/redis`、`src/modules/auth`）、`packages/common`、根 `package.json`、`AGENTS.md` / `README.md` / `.dao/` / `docs/dev/`。
- 风险与未知：模板演示 layer（`11-projects`、`12-teams`）与新业务域并存会混淆边界，去留待 Owner 定；移除 alova 会影响既有上传 demo；本机有 PostgreSQL 16（homebrew，未启动）与 Redis（已运行），**启动数据库服务与建库属环境变更，需先向 Owner 说明并确认**；Prisma 与 `@pinia/colada` 属新增依赖。
- 验收：① `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build` 通过；② admin / web 至少一个业务域 layer 按 `layers.md` 依赖方向落地并在 `docs/dev/` 有约定说明；③ 数据层可用：`@pinia/colada` 完成一个真实接口的 query + mutation（含 SSR 与失效重取），alova 从 `apps/admin` 移除；④ `apps/api` 能连 PostgreSQL 与 Redis，并有可区分的 health / ready 检查；⑤ 鉴权闭环：登录拿 token → 携带 token 访问受保护接口通过、未携带被拒绝；⑥ 文档同步：`AGENTS.md`、`README.md`、`.dao/`、`docs/dev/`。
- 第一刀：Owner 确认三项选型后，建立 `apps/admin` / `apps/web` 的 layer 骨架与 `@pinia/colada` 数据层，再落 `apps/api` 的 PostgreSQL / Redis 接入与鉴权闭环。
- 过门判断：`可开工`；编码前确认门已完成。

## 设计与决策

只记录改变实现方向、范围或验收方式的决定。

| 决策                                                           | 理由 / 证据                                                                                            | 确认者     | 日期       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------- | ---------- |
| 本仓转型为 my-resume 的 Nuxt 实现场，模板能力退为底座          | Owner 选择；与 `my-resume/docs/rs` 的 rs-web / rs-admin / rs-api 三端蓝图同向，只替换宿主仓与前端框架  | Owner 确认 | 2026-10-07 |
| 数据层统一用 `@pinia/colada`，移除 alova                       | Owner 选择；避免同仓两套请求心智。上传这类需要进度 / 取消的场景，用 colada mutation 包一层原生 XHR     | Owner 确认 | 2026-10-07 |
| 第一刀先立基础设施骨架，不直接进业务模块                       | Owner 选择；与 rs 蓝图“先立骨架、再填业务”和模板既有 layers 约定一致                                   | Owner 确认 | 2026-10-07 |
| 领域模型按 rs 蓝图重设计：去字段级 locale、简历多份 draft      | Owner 选择；字段级 `LocalizedText` 在旧项目已被判定为痛点，语言与定制上移到 draft 行更干净             | Owner 确认 | 2026-10-07 |
| 后端 ORM 用 Prisma（含迁移）                                   | Owner 选择；schema 与迁移体验最顺。代价：pgvector 与复杂 SQL 需 raw query，届时单独封装                | Owner 确认 | 2026-10-07 |
| Redis 承担会话/token 黑名单、限流与异步队列，本轮不做缓存      | Owner 选择；三项都是已识别的真实需求。缓存留到确有性能证据时再引入，避免无依据地加一层                 | Owner 确认 | 2026-10-07 |
| 业务域按 rs 蓝图拆分 layer，`20-comps` 保留为组件库索引        | 依赖方向 `00-shared ← feature layers ← app/`；组件 demo 与业务域职责不同，混在一层会互相拖累           | 归枢起草   | 2026-10-07 |
| web 端保持 rs 蓝图口径：纯展示 + 访客 AI 对话                  | rs 蓝图明确 rs-web 不做概览等冗余功能；旧 web 的 profile / review-resume 是否纳入留待 web 模块任务卡定 | 归枢起草   | 2026-10-07 |
| 后端沿用 NestJS 分层（module / controller / service + common） | 沿用旧 `apps/server` 已验证的组织方式，降低重构成本                                                    | 归枢起草   | 2026-10-07 |

### 骨架设计草案（2026-10-07）

**前端业务域 layer**——`apps/admin`：

```text
layers/
├── 11-resume/     简历编辑域：编辑器 / 布局 / 主题 / 版本
├── 12-publish/    发布域：发布检查 / 快照 / 导出
├── 13-settings/   设置域（已存在，改造为业务设置）
├── 14-ai/         AI 域：对话治理 / 导入识别 / 优化 / RAG 管理 / 知识库 / 分析报告
└── 20-comps/      组件库索引与 demo（保留）
```

`apps/web` 同构：`11-public-resume`（公开展示）+ `12-ai-talk`（访客对话）。

- 数据层与基础设施先落 `app/`，不改依赖方向；只有出现跨域复用、可独立测试的复合能力时，才新建 `00-shared`（依据 `docs/dev/layers.md` 第 3 节的“不过早抽象”）。
- 模板遗留 `11-projects` / `12-teams` 与业务域职责不同：建议删除或并入 demo 层，避免边界混淆（**待 Owner 定**）。

### 已确认选型（2026-10-07）

| 项             | 确认结果                                                  | 对骨架的影响                                                                |
| -------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| 领域模型保真度 | 按 rs 蓝图重设计：去字段级 locale，简历多份 draft（≤ 20） | Prisma schema 按 `resume`（主）+ `resume_draft`（多份、带 locale/用途）设计 |
| 后端 ORM       | Prisma（`prisma migrate`）                                | `src/database` 落 Prisma client 封装；pgvector 相关能力留到 RAG 任务卡再定  |
| Redis 用途     | 会话与 token 黑名单/刷新、限流、异步队列（本轮不做缓存）  | `src/redis` 按三类用途分封装；队列先只落接口与状态存储，不引入重型任务框架  |

**数据层（替换 alova）**：

```text
app/
├── lib/http.ts         ofetch 实例：baseURL / 鉴权头 / 统一响应解包（对齐 packages/common）
├── apis/<domain>.ts    按域声明请求函数（纯数据获取，不持有状态）
└── composables/        colada useQuery / useMutation + query key 规范 + 失效策略
```

**后端**——`apps/api/src/`：

```text
├── common/    统一响应 / 异常 / 过滤器 / 拦截器（已有）
├── config/    环境变量读取与校验
├── database/  Prisma client 封装与 schema / 迁移
├── redis/     会话黑名单 / 限流 / 队列三类用途封装
└── modules/   auth（本卡范围）；resume / publish / ai 由后续任务卡各自建立
```

## 确认门与续跑

只有需要 Owner 作出会影响范围、风险、承诺或收口的决定时才填写。本区不新增任务状态：任务保持真实状态，确认门只说明“在等什么”和“确认后从哪里继续”。

- 当前确认门：`已确认，已进入续跑`
- 需要确认：三项选型（领域模型保真度、后端 ORM、Redis 用途）。
- 可接受回答：三项分别选定；若某项要改为“后续模块再定”，请明确它不阻塞骨架落地。
- 确认后回到：`in-progress`
- 确认后第一刀：建立 `apps/admin` / `apps/web` 的 layer 骨架与 colada 数据层，再落 `apps/api` 的 PostgreSQL / Redis 接入与鉴权闭环。
- 已确认事实：Owner 已选定「领域模型按 rs 蓝图重设计（去字段级 locale、多份 draft ≤ 20）」「Prisma」「Redis = 会话与 token 黑名单/刷新 + 限流 + 异步队列，本轮不做缓存」。确认改变了原骨架草案中的 ORM 倾向（Drizzle → Prisma）与 Redis 口径（限流+缓存 → 会话/限流/队列），已按此处更新本卡并进入 `in-progress`。

Owner 用最小回答确认后，Agent 必须先将确认事实写回本区，再执行“确认后第一刀”；不要重新 Grill、不要重新猜主线。未确认前不得越过该门。确认门不是 `blocked`：`blocked` 只表示当前缺少无法自行获得的条件或信息。

## 执行与验证

只保留可复查摘要；原始日志、截图与长输出请链接到外部位置。

| 类型     | 命令 / 样本 / 链接                                                                                                                                                                                                                 | 结果                                                                                                     | 仍未验证的边界                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 机器验   | `pnpm --filter @template/admin typecheck`；根 `oxlint .`                                                                                                                                                                           | 通过；oxlint 0 warning / 0 error，typecheck 无 error                                                     | 全仓 `format:check` 见“已知缺口”                                                                   |
| 结构验   | `layers/11-resume` 被 Nuxt 自动发现；导航 `/resume` 生效；依赖方向未越界                                                                                                                                                           | 通过；`/resume` 200 并渲染域入口内容                                                                     | 简历域的真实业务页面尚未落地                                                                       |
| 意图验   | admin dev `:4020` SSR：`/` 渲染 `api online · uptime …`，`/resume` 200；web dev `:4021` SSR：`/` 渲染 `API 心跳：已连接`，`/resume` `/ai-talk` 均 200                                                                              | 通过；admin 与 web 的 colada 都在 SSR 阶段真实取到后端数据，无 `Failed to resolve component` / `NUXT_E*` | “失效重取”按钮的客户端行为为人工观察，未自动化                                                     |
| 已知缺口 | `pnpm exec oxfmt --check .`                                                                                                                                                                                                        | **在本次改动之前**就对 121 个既有文件报不合格（与本次改动无关）                                          | 需 Owner 决定统一重排，还是锁定 oxfmt 版本                                                         |
| 机器验   | `pnpm --filter @template/admin typecheck`；`oxlint apps/admin`                                                                                                                                                                     | 通过；oxlint 0 warning / 0 error（136 files）                                                            | 全仓 `format:check` 见“已知缺口”（DAO-006）                                                        |
| 结构验   | 去 alova：删除 `plugins/alova.ts`；`apis/files.ts` 改原生 XHR（进度 + `AbortSignal` + 统一解包）；`useFileUploader` 改 colada `useMutation`；`nuxt.d.ts` 去 `$alova`；`package.json` / lockfile 移除 `alova`、`@alova/adapter-xhr` | 通过；业务代码 `grep alova` 残留 **0**；上传不再依赖模板遗留库                                           | —                                                                                                  |
| 意图验   | admin dev `:4047` SSR 抓 `/comps/upload`（`useFileUploader` 上传页）与 `/demos/plugins`                                                                                                                                            | 均 **200**；无 `Failed to resolve component` / `NUXT_E*`；demos 文案已改为「原生 XHR + colada mutation」 | **真实上传端到端未验**（需后端 `/masterData/file/multipleUpload`）；进度回调与取消的浏览器表现未验 |

## 交接

每次换窗口、模型或协作者时，覆盖更新“当前交接”，只保留一条仍有效的接棒信息；重要历史由 Git 记录，不在这里堆叠过程日志。

- 已完成（2026-10-08 追加）：**alova 上传链路迁移完成** —— 原生 XHR + colada mutation，插件与依赖一并移除（证据见「执行与验证」）。验收③的 mutation 部分由此补齐。
- 已完成：项目定位转型的文档同步（`AGENTS.md`、`README.md`、`.dao/`）；三项选型确认并写回；**admin 与 web 两端**的数据层接入 colada（`$request` 契约对齐 `packages/common`、query key 规范、`useHealthQuery` 示例、SSR 取数 + 失效重取验证）；`layers/11-resume`（admin）与 `layers/11-public-resume` + `layers/12-ai-talk`（web）骨架；导航把模板示例折叠进 Demos 入口；`docs/dev/data-layer.md`；两端 README 更新。
- 当前状态：`in-progress`
- 阻塞：无。以下已确认或另立卡：格式基线 → `DAO-006`（待执行）；模板 demo 已折叠为 Demo 入口；启动 PostgreSQL 16 与建库的环境变更仍需在进入 `apps/api` 前确认。
- 下一步第一刀：进入 `apps/api` 的 Prisma + PostgreSQL + Redis 与 auth 闭环（验收④⑤）。**前置**：启动 PostgreSQL 16 与建库属环境变更，需 Owner 先确认；Redis 本机已运行。

- 文档锚点：`dao/CURRENT.md`、`.dao/inheritance.md`、`.dao/context.md`、`docs/dev/layers.md`、`AGENTS.md`
- 集成锚点：`不适用`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：`待补`
- Git / PR：`待补`
- 常规提交：`待补 commit SHA`
- Dao Commit：`不适用`
- 沉淀候选：`无`
- 收口备注：本卡是项目身份变化后的第一个真实任务，同时验证“在模板底座上做产品实现”时 `.dao/` 与 `dao/` 的边界是否仍然成立。
