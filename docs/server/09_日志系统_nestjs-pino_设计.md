# 日志系统：nestjs-pino 接入（原理、设计与验收）

> 出处：`docs/learn/00.md` 阶段 E「日志、审计与恢复能力」的 E1。
> 本文是它落进 `apps/server` 的**设计与实现说明**（不只是学习笔记）。
> 记录日期：2026-10-16（Asia/Shanghai）。
>
> **实现状态：已接线并验收通过**（2026-10-16）。依赖装在 `0156436`，接线与验收在 DAO-044 的
> feature 分支上完成。卡 → [`dao/tasks/DAO-044-可观测性-nestjs-pino.md`](../../dao/tasks/DAO-044-可观测性-nestjs-pino.md)（Issue #52）。
>
> 本文的事实分三类，**不要混读**：
>
> | 标记 | 含义 |
> | --- | --- |
> | ✅ **已核实** | 读了 `apps/server` 的源码 / 锁文件，或在隔离环境实跑过，事实如此 |
> | 📐 **设计决定** | 已落地到代码的决定（实现后回填，不再是"候选"） |
> | ⏳ **未验证** | 还没有证据，或只有间接证据 |
>
> ⚠️ **三处实现与本文最初的设计稿不同，已按实际回填**（都是实测才发现，见 §四、§八）：
>
> 1. **不靠"选一条执行顺序"** —— 改成幂等的单一生成处 `ensureTraceId`，顺序不再是契约（§4.2）
> 2. **自定义 `serializers.req` 收到的不是 Express request** —— pino-http 默认 `wrapSerializers: true`（§4.3）
> 3. **5xx 时 pino-http 会自己塞一个合成 `err`** —— 已用 `customErrorObject` 去掉，否则会有两条栈（§4.5）

---

## 一、场景：当前项目为什么需要它

✅ **已核实的现状**（不是推测）：

| 项 | 事实 |
| --- | --- |
| 现在有几处日志 | **只有 2 处** Nest Logger 调用，都在 `api-exception.filter.ts`（5xx 带栈 / 4xx 一行） |
| 请求 ID | `TraceIdMiddleware` 已是**生成处**：复用上游 `x-request-id`，否则 `randomUUID()` |
| ID 流向 | 已经流向**三处**：日志行、响应头 `x-request-id`、响应体 `traceId` |
| 鉴权载体 | **Bearer（JWT）与 Cookie（`my-resume.token`）两种都在用** |
| 最大的泄漏面 | `PUT /resume/:id/draft` 的**请求体就是整份简历 `document`**（姓名/电话/邮箱/教育/工作） |

**一句话说清"缺什么"**：现在**成功请求没有访问日志**（只有异常才记），且日志是给人看的**字符串**，无法按字段查询。

```
现状：用户报错 → 拿到 traceId → 只能查到"失败那一行"（成功请求什么都没留）
目标：用户报错 → 拿到 traceId → 一查就是这次请求的完整轨迹（method / path / status / 耗时 / 关联异常）
```

---

## 二、概念：先分清"三个东西"，它们不是一回事

这是最容易混的一层。**日志系统由三层组成，各管一段**：

| 层次 | 包 | 干什么 | 类比 |
| --- | --- | --- | --- |
| **引擎** | `pino` | 把 `{level, time, msg, ...fields}` 序列化成 **NDJSON**（一行一条 JSON），写到 stdout | 发动机 |
| **HTTP 中间件** | `pino-http` | 每个请求挂一个 child logger，记 method / url / status / 耗时 / reqId | 传动轴 |
| **Nest 适配层** | `nestjs-pino` | 把 pino 接成 Nest 的 `LoggerService`，让 `app.useLogger()` 和 `new Logger()` 都走 pino | 变速箱 |

### 2.1 和 Nest 内置 Logger 的差别：结构化 vs 字符串

```text
Nest 内置（字符串，给人看）：
LOG [ApiExceptionFilter] [a1b2c3] POST /api/resume → 500 服务器内部错误

pino（结构化，给机器吃）：
{"level":50,"time":1750000000000,"reqId":"a1b2c3",
 "req":{"method":"POST","url":"/api/resume"},"res":{"statusCode":500},
 "responseTime":42,"msg":"服务器内部错误"}
```

**"先有数据、再决定怎么渲染"** —— 这是分水岭。字符串日志只能人眼 + 模糊 `grep`；结构化日志能做**字段级查询与聚合**：

```bash
jq 'select(.responseTime > 1000) | {reqId, url, responseTime}' logs.jsonl
jq 'select(.level >= 50) | .reqId' logs.jsonl
```

> 📌 **层级数值**（pino 官方 API 文档，✅ 已核实）：`trace=10, debug=20, info=30, warn=40, error=50, fatal=60, silent=Infinity`。
> `level` 是**最小阈值**：设成 `info(30)`，则 30/40/50/60 都会输出，10/20 被丢弃。

### 2.2 pino 为什么快（答"为什么选它"）

它不在请求路径上做完整拼装，而是：

1. **child logger 预计算 bindings**：`logger.child({ reqId })` 的绑定**只序列化一次**，之后每次调用直接复用（官方文档明确写了这个"deliberate"设计）；
2. **序列化可转移到 worker 线程**：`transport` 选项把渲染/落盘放到 `thread-stream` 的独立线程，主线程只写缓冲；
3. **`pino.destination`（基于 `sonic-boom`）**：缓冲批量写，吞吐远高于普通 Node stream。

所以它比 `winston` / `bunyan` 快一个量级。高 QPS 下"打日志本身成为瓶颈"是真事，这不是微优化。

### 2.3 前端类比（对齐已有认知）

| 后端日志概念 | 前端类比 |
| --- | --- |
| 结构化日志（NDJSON） | 结构化状态（Pinia store / 归一化数据）vs `console.log('用户xxx点了一下')` |
| `pino-pretty`（渲染器） | Vue DevTools：**数据没变**，只是换了一种给人看的方式 |
| `child logger`（绑定 reqId） | `provide/inject`：上下文一次注入，子树处处可用，不必每层透传 |
| `transport`（worker 线程） | Web Worker：重活挪出主线程 |

> 💡 你在 `docs/learn/B1.md` §七 已经学过"**日志为什么不用每层都传 requestId**" —— pino 的 `child logger` 正是那个问题的工程答案：**用请求级上下文装一次，而不是沿调用链传参**。

---

## 三、项目里**已经有的**那半套：traceId 的现有链路

✅ **已核实**。这是接入 pino 之前必须先读懂的部分：

```text
请求进来
  ↓
TraceIdMiddleware          ← ① 生成/复用 traceId → 写 req.traceId + 响应头 x-request-id
  ↓                          （刻意在「守卫之前」：连 401 的请求也有 ID）
JwtAuthGuard               ← ② 认证 → 写 req.user（AuthUser）
  ↓
Controller / Service
  ↓
ApiResponseInterceptor     ← ③ 成功：包成 { code, data, traceId, timestamp }
  └─ 抛异常 → ApiExceptionFilter  ← ③' 失败：同形状 error body + logger.error/warn（现有日志）
```

**① [`trace-id.middleware.ts`](../../apps/server/src/common/trace-id.middleware.ts)** —— 请求 ID 的**唯一权威生成处**：

```ts
const incoming = req.headers['x-request-id']          // 上游（网关/前端）传了就复用
const traceId = (Array.isArray(incoming) ? incoming[0] : incoming)?.trim() || randomUUID()
req.traceId = traceId                                 // 挂到请求上，供全链读取
res.setHeader('x-request-id', traceId)                // 回写响应头，前端可见
```

源码注释写明了**为什么用中间件而不是拦截器**：

> 中间件在**守卫之前**执行 —— 未授权（401）的请求也已经有了 traceId，日志能串起来；
> 拦截器在守卫之后，401 的请求根本走不到它。

**② [`http-context.ts`](../../apps/server/src/common/http-context.ts)** —— 用 **declaration merging** 给 Express 的 `Request` 补字段：

```ts
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 由 `TraceIdMiddleware` 写入 */
      traceId?: string
    }
  }
}
```

好处：**全仓一处定义**，中间件写、过滤器读，都有类型，不必到处 `as any`。

**③ [`api-response.interceptor.ts`](../../apps/server/src/common/api-response.interceptor.ts) / [`api-exception.filter.ts`](../../apps/server/src/common/api-exception.filter.ts)** —— `traceId` 同时进**响应体**：

```ts
createApiResponse(data, 'ok', { traceId: request.traceId })     // 成功
createApiErrorBody({ message, code, path, errorCode, traceId }) // 失败
```

**所以现状是**：`traceId` 已经流向 **①日志 ②响应头 ③响应体** 三处。

> ⚠️ **这就是 DAO-044 的头号风险**：接入 pino 时如果顺手让它自己 `genReqId()`，立刻会多出**第二个生成处** → ID 分叉成三份，用户报的 ID 在日志里查不到。
> 卡里把这条列为"必须处理的风险"第一条，并明确要求：
> **"谁先执行"不能靠注册顺序猜，必须用「请求头 ID == 日志 ID == 响应头 == 响应体 traceId」断言。**

---

## 四、接入：pino 配置逐项拆解

📐 **设计候选**。版本已由卡与锁文件定档（✅ 已核实）：

| 包 | 版本 | 类型 |
| --- | --- | --- |
| `nestjs-pino` | `^5.3.1` | dependencies |
| `pino` | `^10.4.0` | dependencies |
| `pino-http` | `^11.0.0` | dependencies |
| `pino-pretty` | `^13.2.0` | **devDependencies**（本地可读，生产保持 JSON） |

**为什么是这些版本**：依据本仓真实版本 NestJS `^12.1.2` + Node `v22.18.0`，不是"装最新"。

### 4.1 三处接线

```ts
// app.module.ts —— 根模块「只注册一次」
import { LoggerModule } from 'nestjs-pino'

@Module({
  imports: [
    LoggerModule.forRoot({ pinoHttp: { /* 见 4.3 */ } }),
    // ... 其余模块
  ],
})
export class AppModule {}
```

```ts
// main.ts —— 缓冲启动期日志 + 交出 Logger 出口
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bufferLogs: true,        // ← 关键：不写它，pino 就绪前的启动日志会走默认 Logger
  bodyParser: false,       // 本仓原有配置，保留
})
app.useLogger(app.get(Logger))   // 此后 new Logger() 与 pino 是同一个出口
```

⚠️ **`LoggerModule` 只能在根模块注册一次**。重复注册会让同一个请求被记两遍 —— 这也是 `docs/learn/B2.md` §六"Logger 等基础模块为什么要避免重复初始化"的同一个问题。

### 4.2 请求 ID 归属：**幂等的单一生成处**（实测后落到第三方案）

卡里列了两条路：「中间件生成、Pino 读」或「Pino 生成、中间件读」，并要求选一条并断言。
**实际落地的是第三条** —— 它把"顺序"从契约里彻底去掉：

```ts
// common/trace-id.ts —— 全仓唯一的生成处，且**幂等**
export function ensureTraceId(req: TraceIdCarrier): string {
  if (req.traceId) return req.traceId                 // 后到的直接读到同一个值
  const incoming = req.headers['x-request-id']
  const traceId = (Array.isArray(incoming) ? incoming[0] : incoming)?.trim() || randomUUID()
  req.traceId = traceId
  return traceId
}
```

**两个调用方都调它**：`TraceIdMiddleware` 与 `pino-http` 的 `genReqId`。于是：

|  | 中间件先执行 | pino-http 先执行 |
| --- | --- | --- |
| 谁生成 | 中间件 | pino-http（经 `genReqId`） |
| 另一个 | 读到已生成的值 | 读到已生成的值 |

**两种顺序的结果完全一致** —— 所以"谁先跑"**不再是契约**，也**不需要写顺序断言**。

> 判据：**顺序依赖是隐式契约；能消除就不要靠测试去钉住它。**
> 把"谁先"换成"谁先都一样" —— 后者不随框架版本或模块注册写法漂移。

（同一判据在 `docs/dev/` 里出现过："排布寻址只能有一个权威来源"，只是换了运行时的场景。）

#### 实测确认的两点

1. pino-http 自己的写入方式是 `req.id = req.id || genReqId(req, res)`（见其 `logger.js`）——
   它**也不覆盖已有值**，与幂等设计天然吻合。
2. 日志里请求 ID 的字段是 **`req.id`**，不是顶层 `reqId`（后者不是 pino-http 的默认字段，
   与很多博客写法不一致 —— 断言时要按实现来）。

**判据沉淀**：

> **单一权威来源**。任何"自带 ID 生成能力"的中间件接进来之前，先确认**既有 ID 的权威归属**；
> 顺序依赖是**隐式契约**，必须落成可执行断言。

（这与 `docs/dev/` 里"排布寻址只能有一个权威来源"是同一条判据，只是换了运行时的场景。）

### 4.3 脱敏：Bearer 与 Cookie **两条路都要**

`redact` 是 pino **内置**能力（不是插件），在**序列化阶段**就挖掉路径 —— 敏感值根本没进过日志行。

```ts
pinoHttp: {
  redact: {
    paths: [
      'req.headers.authorization',      // Bearer 载体
      'req.headers.cookie',             // Cookie 载体（my-resume.token）
      'res.headers["set-cookie"]',      // 回写下发的 cookie
    ],
    censor: '[REDACTED]',
  },
}
```

> 📌 官方 API 文档要点（✅ 已核实）：`redact` 的 `censor` 默认值是 **`'[Redacted]'`**（注意大写 R）；
> 路径用 JS 点/括号记法字符串；设 `remove: true` 可整键移除；**官方明确警告"绝不要让用户输入来定义脱敏路径"**。

**⚠️ 实测发现：在本项目里 `redact` 是「兜底」，第一道防线是白名单。**

`pino-http` 默认 `wrapSerializers: true`，因此自定义的 `serializers.req` **不会**收到 Express 的
`Request`，而是收到 `pino-std-serializers` **先跑完的结果** —— 一个普通对象，键为
`id / method / url / query / params / headers / remoteAddress / remotePort`。

由此有三条必须知道（第一版全踩了）：

| 现象 | 对策 |
| --- | --- |
| 拿不到 `req.traceId`（那是我们挂在 Express 上的），但能拿到 **`req.id`** | 白名单里读 `id` |
| 拿不到 `req.socket`，只有扁平的 `remoteAddress` | 不再读 `socket` |
| **`headers` 确实在这个对象上** —— 整块带出去，`authorization` / `cookie` 就进日志了 | 白名单**只挑 `method` / `url` / `id` / `remoteAddress` / `user-agent`**，其余一概不带 |

所以凭据是**"根本不带出来"**，不是"带出来再抹掉"。`redact` 仍然保留 —— 作为
"以后有人把 `headers` 加回来"时的第二层（纵深防御，而不是唯一防线）。

### 4.4 请求体：**默认不记**，而且不要"顺手加"

✅ `pino-http` **默认不记录 body** —— 这是它对的默认。

风险在于**有人为了调试顺手加 body serializer**。本项目这一刀尤其危险：

> `PUT /resume/:id/draft` 的请求体**就是整份简历 document**。

📐 卡里定的方向是**字段白名单**：只记已知安全的字段，而不是"先全记再脱敏"。

**判据沉淀**：

> **黑名单会漏，白名单会缺 —— 日志场景里"缺"可接受，"漏"不可接受。**

### 4.5 级别与噪声控制

```ts
pinoHttp: {
  level: process.env.LOG_LEVEL ?? 'info',        // 环境变量控制，不写死在代码里
  autoLogging: { ignore: req => req.url === '/api/health' },   // 心跳不记
}
```

> **日志的敌人不是"少"，是"噪声"**。`/api/health` 这类探活接口每秒被调一次，记下来只会淹没真日志。
> 配合 `AGENTS.md` §2：新增环境变量要同步更新脱敏的 `.env.example`（✅ `LOG_LEVEL` 已补进 `.env.example`，
> 并在 `env.validation.ts` 里**按枚举校验** —— 配错了启动直接失败，而不是静默按 info 处理）。

### 4.6 `pino-pretty`：只是渲染器，**生产不要用**

| 环境 | 形态 | 原因 |
| --- | --- | --- |
| 本地开发 | `pino-pretty` 彩色可读 | 人眼看 |
| 生产 | **保持 NDJSON** | 采集器要吃 JSON；pretty 会破坏"一行一事件" |

⚠️ 已知限制（官方文档）：`logger.flush()` **不会 flush `pino-pretty` 的输出**。

---

## 五、实验：亲眼看见"结构化"

⚠️ **前置条件**：本工作区（`feat/51-nuxt-config-base`）**没有 pino 依赖**（✅ 已核实 `node_modules` 里没有）；依赖在 `origin/dev` 的 `0156436`。所以下面的实验要么先切含依赖的分支，要么等你接线。

### 实验 1：pino 的最小形态（不看 Nest，先看引擎）

```bash
# 期望：一行一条 JSON —— 这就是 NDJSON，机器可直接解析
node -e "
const pino = require('pino')
const log = pino()
log.info('hello')
log.info({ reqId: 'a1b2c3', responseTime: 42 }, 'request done')
log.error({ err: new Error('boom') }, 'failed')
"
```

**要观察的三件事**：

1. 每行都是**合法 JSON**（可被 `jq` 吃）；
2. 数字型 `level`（`30` / `50`），不是 `"INFO"` 字符串；
3. `err` 字段**自动展开**成 `type / message / stack` —— 这是 pino 默认的 `err` serializer（`serializers` 默认 `{ err: pino.stdSerializers.err }`）。

### 实验 2：用 `jq` 做字段级查询（结构化日志的回报）

```bash
node -e "
const pino = require('pino')
const log = pino()
for (const t of [12, 340, 1200]) log.info({ reqId: 'r' + t, responseTime: t }, 'done')
" > /tmp/pino-demo.jsonl

# 只挑慢请求
jq 'select(.responseTime > 1000) | {reqId, responseTime}' /tmp/pino-demo.jsonl

# 只看 warn 以上（level >= 40）
jq 'select(.level >= 40)' /tmp/pino-demo.jsonl
```

> **这就是"字符串日志做不到"的地方**：`grep '响应慢'` 依赖人类写文案；`jq 'select(.responseTime > 1000)'` 依赖**字段**。

### 实验 3：`redact` 真的挖掉了吗

```bash
node -e "
const pino = require('pino')
const log = pino({ redact: { paths: ['req.headers.authorization'], censor: '[REDACTED]' } })
log.info({ req: { headers: { authorization: 'Bearer SECRET.TOKEN.VALUE', accept: 'application/json' } } }, 'in')
"
```

**验收点**：输出里 **`SECRET` 一个字符都不出现**；`accept` 正常保留（脱敏是**按路径**，不是整块丢弃）。

### 实验 4：`child` 绑定的复用（理解为什么日志不用层层传参）

```bash
node -e "
const pino = require('pino')
const base = pino()
const reqLog = base.child({ reqId: 'a1b2c3' })   // 绑定只序列化一次
reqLog.info('step 1')
reqLog.info('step 2')
"
```

**验收点**：两行都自动带 `reqId`，**调用处不用重复传**。

---

## 六、项目应用：接完之后，一次排查长什么样

### 6.1 目标链路

```text
用户说："我保存失败了，页面报了个 id：a1b2c3"
    ↓
① 前端能拿到这个 id    ← 来自响应头 x-request-id（或响应体 traceId）
② 后端 grep 'a1b2c3'   ← 日志行里是同一个 id
③ 一条命令看全轨迹      ← 含 500 的堆栈、耗时、状态码
```

**这就是"可观测性"最小可用的形状**：不用猜、不用复现，一个 id 串起前端 → 后端。

### 6.2 怎么查看日志：现在 / 接入后 / 生产

**现在（未接线）** —— Nest 内置 Logger 写 stdout，仓库把它重定向进了文件：

```bash
tail -f .local/server-dev.log
grep 'a1b2c3' .local/server-dev.log
grep -E 'ERROR' .local/server-dev.log | tail -50
```

**接入 pino 后｜本地要人眼可读**：

```bash
pnpm --filter @rs/server dev | pnpm exec pino-pretty
```

**接入 pino 后｜要按字段查**：

```bash
node dist/main.js | jq 'select(.level >= 40)'
node dist/main.js | jq 'select(.responseTime > 500) | {reqId, url, responseTime}'
node dist/main.js | jq -r 'select(.res.statusCode >= 500) | .reqId'
```

**生产（业内约定）**：

```text
容器只写 stdout
   → 容器运行时收集（Docker json-file / k8s）
     → 采集器（Promtail / Filebeat / Fluent Bit）
       → 存储（Loki / ES）
         → 查询界面（Grafana / Kibana）：按 traceId 搜、按 level 聚合、按耗时排序
```

> **应用侧不变的纪律**：应用只写 stdout，**不知道也不关心**日志最终去哪。这样本地、CI、生产是同一套代码、同一种格式。
> 这就是 12-Factor 的 **Logs** 原则：把日志当**事件流**，路由与存储交给运行环境。

### 6.3 日志轮转与保留（⏳ 待写清）

`00.md` 的 E1 清单里有「stdout、日志采集、轮转和保留」这一项。**现在还没做**，落到本项目的具体形状是：

| 问题 | 候选 | 谁来定 |
| --- | --- | --- |
| 本地日志文件长多大 | `.local/*.log` 目前是**无轮转**的裸文件（✅ 实测 `server-dev.log` 已 274 KB，`web-dev.log` 已 **4.1 MB**） | 开发便利 vs 磁盘，可先不管 |
| 生产保留多久 | 由采集端配置，**不在应用里** | 部署决定 |
| 敏感内容保留期 | 与"用户注销后怎么办"联动 | **产品决定**（属 DAO-045） |

---

## 七、日志 ≠ 审计：为什么一个进数据库，一个不进

你在提问时问的是"**怎样体现在数据库里**"。答案是：**日志一行都不进数据库，这是刻意的**。

📐 DAO-044 卡的「非目标」第一条就写着 `日志入 PG`；要进库的是**审计**，那是 `DAO-045`（Issue #53）。

### 7.1 两者的要求恰好相反

| | **运行日志**（E1 / DAO-044） | **审计**（E2 / DAO-045） |
| --- | --- | --- |
| 回答的问题 | 系统**出了什么事**：谁在什么时候调了什么、多慢、错在哪 | 谁对**哪条业务数据**做了什么 |
| 典型字段 | traceId / method / path / status / 耗时 / 异常栈 | actor / action / target(id) / 变更前后 / 时间 |
| 丢一条要紧吗 | 不要紧（统计意义） | **要紧**（可能正是那条删除） |
| 需要事务一致吗 | 不需要 | **需要**（业务写入与审计同生共死） |
| 归宿 | **stdout** → 采集器 | **数据库表** |
| 保留 | 短（几天~30 天） | 长（常年级） |
| 可变吗 | 无所谓 | **必须不可篡改** |

### 7.2 为什么日志不该进库（三条，都可面试）

1. **耦合**：日志一旦写库，就变成业务事务的一部分 —— 库挂了要不要影响打日志？**打日志失败绝不能拖垮业务。**
2. **性能与放大**：一次请求产生多行日志，写库 = 每行一次 INSERT，**还是在主库上**，会污染业务库的 IO 与连接池。
3. **职责错位**：日志的消费方式是**全文检索 + 聚合 + 时序**，而 PostgreSQL 是**事务型**数据库。专业的事交给专业工具。

### 7.3 一条判据

> **一次写入如果"必须与业务操作同生共死、且以后要按业务对象反查"，它就该进数据库（审计表）；否则它就是日志，写 stdout。**

这也解释了 DAO 为什么**拆两张卡**：审计要动 `schema.prisma` + 迁移，还牵扯"保留多久 / 谁可查 / 删号如何处理"等**产品决定**（按 `AGENTS.md` §3.3「一轮一张卡一条闭环」，不能混）。

---

## 八、验收：卡里的 8 条标准（✅ 已执行）

来源：[DAO-044 验收标准](../../dao/tasks/DAO-044-可观测性-nestjs-pino.md)。
自动化入口：`pnpm --filter @rs/server test:logging` —— **隔离 PostgreSQL（55433）+ 隔离端口（4059）**，
因为验收 7 要真实写入一份含 PII 的简历，**绝不能在开发库上跑**（脚本里有两道断言闸挡住）。

| # | 标准 | 结果 | 怎么验的 |
| --- | --- | --- | --- |
| 1 | 成功保存的访问日志含状态码 / 耗时 / 请求 ID | ✅ | 断言该请求的访问日志行有 `res.statusCode: 200`、**数值型** `responseTime`、非空 `req.id` |
| 2 | **未登录 401 仍有请求 ID** | ✅ | 匿名请求 → 断言响应头 / 响应体 / 日志三处都有 ID（"守卫前生成"的设计没退化） |
| 3 | DTO 校验失败：访问日志完整 | ✅ | 非法 body → 断言**同时**存在访问日志行（400）与过滤器那条校验错误 |
| 4 | DB 报错 500：有可关联堆栈；响应体**不含**内部细节 | ✅ | **真的把隔离库停掉**再打 `GET /resume/public` → 500 + 响应体只有「服务器内部错误」+ 日志里**有且仅有一条**带 stack |
| 5 | 并发两用户：日志上下文不串 | ✅ | 两个并发请求（各自 ID）→ 断言 A 的日志行里不出现 B 的 ID（反向亦然） |
| 6 | **请求头 ID == 日志 ID == 响应头 == 响应体 traceId** | ✅ | 带 `x-request-id` 发请求，四处逐一对齐（**本卡核心断言**） |
| 7 | `PUT /resume/:id/draft` 后日志搜不到 cookie / Bearer / 姓名 / 手机 / 邮箱 | ✅ | 真实保存一次（PII 写在 `summary` 里）+ 携带 Cookie 与 Bearer → 断言 7 个敏感串**全部 0 命中**，含**真实 JWT** |
| 8 | `pnpm check` 全绿 | ✅ | 质量门；服务端另有 **12 个新增单测**钉住幂等与脱敏配置（`trace-id` 5 个 + `logging.config` 7 个） |

### 实测推翻的四处"想当然"（都写进了代码注释）

| 以为 | 实际 | 后果 |
| --- | --- | --- |
| 日志顶层有 `reqId` | pino-http **不产生**顶层 `reqId`，ID 在 `req.id` | 断言写错会"看不到 ID"，却误以为是配置没生效 |
| 自定义 `serializers.req` 收到 Express request | 收到的是 `pino-std-serializers` 的**输出**（`wrapSerializers: true`） | 读 `req.traceId` / `req.socket` 全是 `undefined` |
| 5xx 时访问日志不带错误 | pino-http 会**自己造** `failed with status code 5xx` 并带上栈 | 与过滤器的真实栈**重复两条**，且其中一条指向它自身内部 |
| `redact` 是第一道防线 | 在这个配置里它是**第二道**；第一道是白名单序列化 | 只靠 `redact` = 把安全押在"路径没写错"上 |

⚠️ **第 8 条的历史缺口**：本仓曾出现 `node --test` 在**测试文件被删光**时仍以 0 退出 → "全绿"其实什么都没验。
已由 DAO-039 改为 `vitest run --passWithNoTests=false`（✅ `apps/server/package.json` 现为 `vitest`）。
这正是 `AGENTS.md` §4 那条"**`test` 必须能区分'通过'与'没有测试'**"的来历。

---

## 九、本节记住五句话

1. **日志 ≠ 审计**：与业务同生共死 + 按业务对象反查 → 进库；否则 → stdout。
2. **单一权威 ID**：接入任何"自带 ID 生成"的中间件前，先定权威归属；**顺序不能猜，要用断言钉住**。
3. **安全默认方向**：白名单优于黑名单（缺可接受、漏不可接受）；脱敏发生在**序列化阶段**，不是事后过滤。
4. **结构化优于字符串**：先有数据、再决定怎么渲染（`pino-pretty` 是渲染器，不是日志本身）。
5. **可观测性的最小闭环**：一个 id 从用户的报错串到日志里的堆栈。

---

## 十、三道自测

1. `TraceIdMiddleware` 已经生成了 `traceId`，为什么接入 pino 时还要单独处理 `genReqId`？如果直接让 pino 自己生成，会发生什么？
2. 为什么说"脱敏应该用 `redact` 在序列化阶段做"，而不是"先记全、再过滤字符串"？这两者在**安全保证**上差在哪？
3. `PUT /resume/:id/draft` 的请求体是整份简历。如果同事说"我加个 body 日志方便调试"，你用什么判据说服他？替代方案是什么？

（把你原来的理解写在下面，再对照 §二～§七 —— 这是 `00.md` §四要求的"我原来怎么理解 / 正确机制是什么"。）

```text

```

---

## 十一、与其它文档的关系

| 文档 | 关系 |
| --- | --- |
| [`00.md`](../learn/00.md) §阶段 E | 本节的出处与学习清单（E1） |
| [`B2.md`](../learn/B2.md) §六 | 「Logger 等基础模块避免重复初始化」—— 接 `LoggerModule.forRoot` 前先读 |
| [`B1.md`](../learn/B1.md) §七 | 「日志为什么不用每层都传 requestId」—— `child logger` 是它的工程答案 |
| [`DAO-044`](../../dao/tasks/DAO-044-可观测性-nestjs-pino.md) | 实现卡（Issue #52）：验收标准、风险、测试计划 |
| [`DAO-045`](../../dao/tasks/DAO-045-审计表.md) | 审计表（Issue #53）：E2 的实现卡，等产品决定 |

> 📌 **体例小注**：`00.md` §四 建议的笔记目录是 `docs/learning/backend/`，实践落在了 `docs/learn/`（本仓现状）。
> 本文遵循**现状**；`00.md` 那处建议后续可对齐。
