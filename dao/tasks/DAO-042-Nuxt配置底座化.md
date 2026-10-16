# 【DAO-042】Nuxt 配置底座化：抽出 `@rs/config` 共享基线

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`designed`
- Owner：`昇哥（2026-10-16：参考我另一个项目 greensketch-website 的 nuxt.config.ts 对本仓进行优化；后续也希望本仓成为我的 Nuxt monorepo 基础脚手架）`
- 创建日期：`2026-10-16`
- 分支：`feat/51-nuxt-config-base`
- Issue：[#51](https://github.com/Fridolph/my-resume-fullstack/issues/51)
- 关联：`AGENTS.md` §1（底座保持通用可抽离）/ §4.6（三层归属判据）、[`docs/web/03_Layers_分层约定.md`](../../docs/web/03_Layers_分层约定.md)

## 状态轨迹

每次迁移只写“为什么能过这一门”的最少依据，不写流水日志。

| 迁移                  | 依据                                                                                                            | 确认者 | 日期       |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ------ | ---------- |
| `planned -> designed` | Owner 已定范围（A+B1+C）与形态（纯函数包）；重复量已量化：两端各 73 行、逐行 diff 仅 15 行，其中 26 行注释逐字相同 | 昇哥   | 2026-10-16 |

## Grill：开工前对齐

- **目标**：把 `apps/web` 与 `apps/admin` **逐字重复**的 Nuxt 构建基线收进一个可复用的纯函数包 `@rs/config`，使本仓可作为 Nuxt monorepo 底座被复制到下一个项目。
- **边界**：
  - 新增 `packages/config`（`@rs/config`），导出 `defineRsNuxtConfig(options, overrides)`
  - 两端 `nuxt.config.ts` 改为调用它，只保留各自独有的部分
  - 附带 **B1**：`pages.pattern` 排除 `**/components/**` + 页面私有组件自动注册
  - 附带 **C**：分环境 sourcemap、`runtimeConfig.public.version/commit`、安全响应头
- **不做**：
  - 不移植 greensketch 的部署与业务选型：`nitro.preset: 'aws-amplify'`、i18n、content、nuxt-auth、posthog、nuxt-image、rive、echarts、dayjs、scripts、seo/ogImage/socialShare、`@teages/nuxt-legacy`
  - 不引入 `devServer.host/port`（本仓多应用端口各异，留在各自 `package.json` 的 `dev` script 里更灵活）
  - 不做 `typescript.tsConfig.include: ['../@types/**']`（本仓暂无该目录，先有需求再加）
  - 不引入 `postcss.autoprefixer`（Tailwind 4 自带前缀处理）
  - 不自动导入 `apis`（会弱化 [`docs/web/04_数据层_约定.md`](../../docs/web/04_数据层_约定.md) §1「组件不直接发请求」的边界，Owner 2026-10-16 已选择不做）
  - **不修** DAO-038 遗留①「不存在的简历返回 HTTP 200」（另轮处理，已有独立诊断）
  - **不修** 两个 app 里 `"lint": "nuxt typecheck"` 的假 lint（Owner 本轮未选；已记为独立发现，应另开卡）
- **涉及文件 / 模块**：
  - 新增 `packages/config/{package.json,tsconfig.json,src/index.ts}`
  - 改 `apps/web/nuxt.config.ts`、`apps/admin/nuxt.config.ts`
  - 改 `apps/web/package.json`、`apps/admin/package.json`（新增 workspace 依赖）
  - `pnpm-lock.yaml`
  - `README.md`（§1 要求新增包同步更新 README）
- **风险与未知**：
  1. **最大未知（go/no-go）**：`nuxt.config.ts` 由 c12 + jiti 加载，时机早于任何 build。`@rs/config` 的 `exports` 必须直指 `src/index.ts` 源码，依赖 jiti 转译 workspace 内的 TS。跑不通则退：**退路 A** `exports` 指向 `.mjs` 薄壳 + `tsc` 预构建到 `dist`（代价：新克隆必须先 build）；**退路 B** 退回 Nuxt layer 形态（`extends`），与 greensketch 的 `layers/00-shared` 一致。
  2. `$development` 是否被当前 Nuxt 版本支持（greensketch 在用，方向可靠，仍需实测）。
  3. `hooks['components:dirs']` 遍历 `nuxt.options._layers` 时，`layers/11-public-resume` 是否在其中 —— 它靠 Nuxt 4 的 `layers/` 自动发现挂载，不是显式 `extends`。这决定 B1 能否覆盖业务 layer 的页面组件。
  4. git sha 注入在 shallow clone / 无 git 环境会抛异常 → 必须 try/catch 回退 `'unknown'`。
- **验收**：
  - `pnpm check`（`release-notes:check` → `format:check` → `lint` → `typecheck` → `test`）全绿
  - 两端 dev 起来后路径全 200：web `/`、`/resume/4`、`/my-resumes`；admin `/`、`/resume`、`/resume/new`、`/resume/4/edit`
  - **回归重点**：两端富文本编辑器**不再报** `RangeError: Adding different instances of a keyed plugin` —— 这是 `optimizeDeps` 那段配置唯一的存在理由
  - `curl -sI http://localhost:4041/` 含 `X-Frame-Options: SAMEORIGIN`
  - SSR payload 含 `commit` 与 version
  - **B1 探针**：临时建 `apps/web/app/pages/__probe/index.vue` + `apps/web/app/pages/__probe/components/ProbeCard.vue`，验证 ① `/__probe` 可访问 ② `/__probe/components/ProbeCard` **不可**访问 ③ `index.vue` 不 import 即可用 `<ProbeCard />`；验证后**删除探针**
- **第一刀**：go/no-go 探针 —— 建最小 `packages/config`，让 `apps/web` 引一行，跑 `nuxt prepare`，确认 jiti 能转译。
- **过门判断**：`可开工`（Owner 已定范围与形态，重复量与退路均已核实）

## 设计与决策

只记录改变实现方向、范围或验收方式的决定。

| 决策                                                | 理由 / 证据                                                                                                                                          | 确认者           | 日期       |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- |
| 包名用 `@rs/config`（而非 `@rs/nuxt-base`）         | Owner 目标是「Nuxt monorepo 基础脚手架」，tsconfig / oxlint / tailwind 基线未来都要有落点，一次命名到位，避免二次改名                                  | 昇哥             | 2026-10-16 |
| 用纯函数包，不用 Nuxt layer                         | layer 会同时承担「页面/组件/样式」与「构建基线」两种职责，违反 §4.6 三层判据；配置工厂不碰 Vue/Nuxt UI，属「能脱离运行时」那一层                        | 昇哥（选定形态） | 2026-10-16 |
| 业务 alias（`#rs/resume-content`）留在各 app        | 它是展示域契约，塞进通用底座等于让底座认识业务。底座只负责合并 `overrides.alias`                                                                      | AI               | 2026-10-16 |
| B1 用 `pathPrefix: true`                            | 避免同名冲突；**不移植** greensketch 的 `RE_COMPONENTS` 名称归一闪（那是它自己的命名约定）。代价是组件名偏长，先接受并写进文档，等首个真实用例再复议 | AI（可复议）     | 2026-10-16 |
| 两端 Tiptap 注释合并为一份                          | 两端讲的是同一个坑（`@tiptap/pm` 无根导出 / `prosemirror-*` 需 `@nuxt/ui >` 前缀），保留信息更全的一版                                             | AI               | 2026-10-16 |

## 确认门与续跑（按需）

- 当前确认门：`无`（Owner 已定范围 A+B1+C 与形态；卡内两个 AI 默认值已标注可复议）
- 需要确认：—
- 可接受回答：—
- 确认后回到：—
- 确认后第一刀：—
- 已确认事实：`2026-10-16 Owner 选定「A 共享基线 + B1 页面私有组件 + C 构建运行时基线」与「packages/nuxt-base 纯函数包」形态；包名由 AI 建议统一为 @rs/config`

## 执行与验证

只保留可复查摘要；原始日志、截图与长输出请链接到外部位置。

| 类型   | 命令 / 样本 / 链接 | 结果 | 仍未验证的边界 |
| ------ | ------------------ | ---- | -------------- |
| 机器验 |                    |      |                |
| 结构验 |                    |      |                |
| 意图验 |                    |      |                |

## 交接

- 已完成：—
- 当前状态：`designed`
- 阻塞：无
- 下一步第一刀：go/no-go 探针 —— 建最小 `packages/config` + 让 `apps/web` 引一行 + `nuxt prepare`
- 文档锚点：`AGENTS.md` §1 / §4.6、[`docs/web/03_Layers_分层约定.md`](../../docs/web/03_Layers_分层约定.md)
- 集成锚点：`待 feature -> dev`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：
- Git / PR：
- 常规提交：`待补 commit SHA`
- Dao Commit：`不适用`
- 沉淀候选：`无`
- 收口备注：
