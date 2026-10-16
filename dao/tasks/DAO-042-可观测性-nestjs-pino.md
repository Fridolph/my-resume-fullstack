# 【DAO-042】可观测性第一阶段：接入 nestjs-pino + 统一请求 ID + 脱敏

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`designed`（依赖变更已获 Owner 确认，可开工）
- Owner：`昇哥（2026-10-16：感觉少了些什么…发现没有日志系统…按照建议执行，开 DAO-042 卡）`
- 创建日期：`2026-10-16`
- 分支：待建 `feat/52-nestjs-pino`
- Issue：[#52](https://github.com/Fridolph/my-resume-fullstack/issues/52)
- 关联：`DAO-043`（审计表，#53）、`common/trace-id.middleware.ts`

## 目标与边界

- 目标：让**每次请求可追踪、关键修改可追责、日志不泄露用户内容**的前半段（可追踪 + 不泄露）落地。
- 范围：`apps/server` 的日志接入与请求 ID 归并；配置与启动方式调整。
- 非目标：审计表（→ DAO-043）· ES / 完整 OTel / 分布式追踪 · 日志入 PG · 自研 Logger 框架 · 全量 SQL 日志。

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

- 已完成：现状核实 · 版本定档 · 风险识别 · 验收与测试计划 · 依赖影响与回滚 · Owner 确认
- 当前状态：`designed`
- 阻塞：无
- 下一步第一刀：装 v5 依赖 → 根模块注册 + `main.ts` 接入 → **先只做场景 6 的 ID 一致性**，确认权威归属后再补脱敏
- 文档锚点：`apps/server/src/common/`（trace-id / http-context / filter / interceptor）
- 集成锚点：`待 feature -> dev`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：待补
- Git / PR：待补
- Dao Commit：`不适用`（单任务收口走 Conventional Commit）
- 沉淀候选：`「引入会自行生成请求 ID 的中间件前，先确认既有 ID 的权威归属」——若第二个项目复现，值得考虑归母`
- 收口备注：
