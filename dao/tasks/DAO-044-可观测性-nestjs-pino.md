# 【DAO-044】可观测性第一阶段：接入 nestjs-pino + 统一请求 ID + 脱敏

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done`（2026-10-16 收口：接线完成 · **8 条验收全部通过** · 已合入 `dev` 并推送）
- Owner：`昇哥（2026-10-16：感觉少了些什么…发现没有日志系统…按照建议执行，开 DAO-042 卡）`
  ⚠️ 原编号 DAO-042，与并行窗口的 `DAO-042-Nuxt配置底座化.md` 撞号，本卡改为 **DAO-044**（043 留给该窗口）
- 创建日期：`2026-10-16`
- 分支：待建 `feat/52-nestjs-pino`
- Issue：[#52](https://github.com/Fridolph/my-resume-fullstack/issues/52)
- 关联：`DAO-045`（审计表，#53）、`common/trace-id.middleware.ts`

## 目标与边界

- 目标：让**每次请求可追踪、关键修改可追责、日志不泄露用户内容**的前半段（可追踪 + 不泄露）落地。
- 范围：`apps/server` 的日志接入与请求 ID 归并；配置与启动方式调整。
- 非目标：审计表（→ DAO-045）· ES / 完整 OTel / 分布式追踪 · 日志入 PG · 自研 Logger 框架 · 全量 SQL 日志。

## 现状（已核实，非推测）

| 项 | 事实 |
| --- | --- |
| 版本 | NestJS `^12.1.2` + Node `v22.18.0` → **`nestjs-pino` v5** |
| 现有日志 | 仅 **2 处** Nest Logger 调用（`api-exception.filter.ts` 的 5xx/4xx、启动） |
| 请求 ID | `TraceIdMiddleware` 已是生成处：复用上游 `x-request-id`，否则 `randomUUID()`；写 `req.traceId` + 响应头。**刻意在守卫之前**（401 也有 ID） |
| 上下文 | `http-context.ts` declaration merging：`req.traceId` / `req.user`（`AuthUser`） |
| 响应 | `api-response.interceptor.ts` 成功响应体已带 `traceId`；`api-exception.filter.ts` 失败响应同理 |
| 鉴权载体 | **Bearer（JWT）与 Cookie（`my-resume.token`）两种都在用** |
| PII 泄漏面 | `PUT /resume/:id/draft` 的**请求体就是整份 `document`**（姓名/电话/邮箱/教育/工作） |

## 三个必须处理的风险（这是本卡的核心，不是附录）

### ① 请求 ID 的单一权威

已有 `req.traceId` 会流向**三处**：日志、响应头、响应体。

不能让 Pino 自己 `genReqId`，否则立刻分叉成三份。正解是让 Pino **读**已生成的值。
⚠️ **"谁先执行"不能靠注册顺序猜** —— 必须用「请求头 ID == 日志 ID == 响应头 == 响应体 `traceId`」断言。
若实测顺序不可靠，改为"**由 Pino 生成 → 中间件只读取并回写** `req.traceId` + 响应头"，
仍然保持单一生成处。**两条路都可以，但必须选一条并断言，不能并存。**

### ② 脱敏是必需项（不是可选加固）

Bearer 与 Cookie 两种载体都在用，两处都要脱敏。

### ③ 简历全文"默认就会泄"

`pino-http` 默认不记 body（这点没问题），风险在于**有人顺手加 body serializer**。
采用**字段白名单**思路：只记已知安全的字段，而不是"先全记再脱敏"。

## 依赖变更（已获 Owner 确认）

| 项 | 内容 |
| --- | --- |
| 新增 | `nestjs-pino@^5`、`pino`、`pino-http`（运行时）；`pino-pretty`（dev，本地可读） |
| 影响 | `app.module.ts`（根模块**只注册一次**）、`main.ts`（`bufferLogs: true` + `app.useLogger`）、`TraceIdMiddleware` 与 Pino 的 ID 归属、Filter 输出渠道 |
| 回滚 | 移除依赖 + 还原 `NestFactory.create` 调用。**不涉及数据与契约变更** |

## 验收标准

1. 成功保存：访问日志含状态码 / 耗时 / 请求 ID
2. **未登录 401 仍有请求 ID**（守卫前生成的设计不得退化）
3. DTO 校验失败：访问日志完整
4. DB 报错 500：有可关联堆栈；客户端响应不含内部细节
5. 并发两用户：日志上下文不串（`req.user` 绑定）
6. **请求头 ID == 日志 ID == 响应头 == 响应体 `traceId`**
7. `PUT /resume/:id/draft` 后，日志中搜不到 cookie 值 / Bearer 值 / 姓名 / 手机号 / 邮箱
8. `pnpm check` 全绿

## 测试计划（按风险）

| 风险 | 验证 |
| --- | --- |
| ID 分叉成三份 | 场景 6 断言四处一致 |
| Pino 覆盖中间件的 ID | 审查配置无自生成 `genReqId`；重跑场景 6 |
| 全文 / 凭据入日志 | 场景 7：真实保存一次后 grep 敏感串 |
| 重复打印同一堆栈 | 触发 500，确认只有一条带 stack |
| LoggerModule 重复注册 → 请求记两遍 | 断言一个请求只产生一条访问日志 |

## 交接

- 已完成：现状核实 · 版本定档 · 风险识别 · 验收与测试计划 · 依赖影响与回滚 · Owner 确认 ·
  **接线实现**（`common/trace-id.ts` 的幂等 `ensureTraceId` / `common/logging.config.ts` 的白名单序列化 +
  `redact` 兜底 / `app.module.ts` 的 `LoggerModule.forRootAsync` / `main.ts` 的 `bufferLogs` + `useLogger` /
  `LOG_LEVEL` 环境变量）/ **12 个新增单测** / **隔离环境 8 条验收全通过** /
  文档 [`docs/server/09_日志系统_nestjs-pino_设计.md`](../../docs/server/09_日志系统_nestjs-pino_设计.md)
- 当前状态：`done`
- 阻塞：无
- 下一步第一刀：**本卡无未完成项**。可观测性若继续推进，下一步是 `DAO-045`（审计表，#53，等产品决定）
- 文档锚点：`docs/server/09_...设计.md`（§4.2 / §4.3 / §八 记录了实测推翻的四处"想当然"）、
  `apps/server/src/common/{trace-id,logging.config}.ts`
- 集成锚点：`已 feature -> dev`（`f7ccf23` 实现与文档，ff 合入并推送 `origin/dev`）

## 实现中与设计稿不同的三处（都是实测才发现）

| # | 设计稿 | 实际落地 | 为什么改 |
| --- | --- | --- | --- |
| 1 | 「中间件生成 / Pino 读」或「Pino 生成 / 中间件读」，**选一条并断言顺序** | **幂等的单一生成处** `ensureTraceId`，两个调用方都调它 | 顺序依赖是隐式契约；换成"谁先都一样"后**不需要**顺序断言，也不随框架版本漂移 |
| 2 | `genReqId: req => req.traceId` | 自定义 `serializers.req` 读 **`req.id`** | `pino-http` 默认 `wrapSerializers: true`，serializer 收到的是 `pino-std-serializers` 的输出（普通对象），**没有** `traceId` / `socket` |
| 3 | 只用 `redact` 脱敏 | **白名单序列化（第一层）+ `redact`（兜底）** | `redact` 是"路径没写错才安全"；白名单是"凭据根本不带出来"。判据：黑名单会漏，白名单会缺；日志场景里"缺"可接受，"漏"不可接受 |

另有一处由验收暴露：`pino-http` 在 `statusCode >= 500` 时会**自己造**一个
`failed with status code 5xx` 并带上栈 → 会与过滤器的真实栈**重复两条**。
已用 `customErrorObject` 去掉那个合成占位（真实错误仍保留）。

## 收口与沉淀

- `dao-review` 结论：`可收口`
- 最终验证证据：
  - **隔离环境 8 条验收全通过** —— `pnpm --filter @rs/server test:logging`
    （独立 PostgreSQL 55433 + 独立端口 4059；含"真的停库制造 500"与"真实写入含 PII 的简历后 grep 敏感串"）
  - `pnpm check` 全绿；服务端 16 个单测（**新增 12 个**：`trace-id` 5 + `logging.config` 7）
- Git / PR：无 PR（在 `dev` 上收口）
- 常规提交：`f7ccf23`（实现 + 文档；本收口提交紧随其后）
- Dao Commit：`不适用`（单任务收口走 Conventional Commit）
- 沉淀候选：`候选观察` —— **「引入会自行生成请求 ID 的中间件前，先确认既有 ID 的权威归属」**。
  本轮把它落成了更彻底的形式：与其"选一条顺序并断言"，不如把生成做成**幂等**，顺序就不再是契约。
  对任何"框架中间件与自研中间件都可能先生成同一个资源"的场景都成立。等第二个项目复现后再判断是否归母。
- 收口备注：
  - ⚠️ **`test-resume-isolated.sh` 在 `dev` 上本来是坏的**：它调的 `resume-http.mjs` 导入
    `packages/common/test/fixtures/resume.mjs`，而仓里实际是 `resume.ts` → 模块找不到。
    本卡**没有修它**（属 DAO-028 的验收工具，不在本卡范围），而是在新脚本里自带完整流程。
    这是一个待开的独立缺陷。
