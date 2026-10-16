# 【DAO-042】Nuxt 配置底座化：抽出 `@rs/config` 共享基线

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done`（2026-10-16 收口：A + B1 + C 全部实现、机器验证、**已合入 `dev` 并推送**；Owner 意图验收写入下方「确认门与续跑」）
- Owner：`昇哥（2026-10-16：参考我另一个项目 greensketch-website 的 nuxt.config.ts 对本仓进行优化；后续也希望本仓成为我的 Nuxt monorepo 基础脚手架）`
- 创建日期：`2026-10-16`
- 分支：`feat/51-rs-config`
  - ⚠️ **本轮按 Owner 2026-10-16 的多会话约定在独立 worktree 中开发**（见 `AGENTS.md` §1）：
    工作目录 `/Users/fri/Desktop/personal/my-resume-fullstack-worktrees/feat/51-rs-config`。
    不能在共享目录里开发 —— 本卡第一次建卡时就发生过"另一个会话在共享目录 `git add` 把本卡卷进它的提交"。
  - 分支名用 `rs-config` 而非 `nuxt-config-base`：后者在共享目录里被另一个会话占用过；
    合回 `dev` 后可统一。
- Issue：[#51](https://github.com/Fridolph/my-resume-fullstack/issues/51)
- 关联：`AGENTS.md` §1（底座保持通用可抽离 + 多会话 worktree 约定）/ §4.6（三层归属判据）、[`docs/web/03_Layers_分层约定.md`](../../docs/web/03_Layers_分层约定.md)、`DAO-044` / `DAO-045`（并行窗口的两张卡，本卡的编号冲突即由它们让出）

## 状态轨迹

每次迁移只写“为什么能过这一门”的最少依据，不写流水日志。

| 迁移                      | 依据                                                                                                            | 确认者 | 日期       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ | ---------- |
| `planned -> designed`     | Owner 已定范围（A+B1+C）与形态（纯函数包）；重复量已量化：两端各 73 行、逐行 diff 仅 15 行，其中 26 行注释逐字相同 | 昇哥   | 2026-10-16 |
| `designed -> in-progress` | go/no-go 探针通过：`@rs/config` 的 `exports` 直指 `./src/index.ts`，两端 `nuxt prepare` 成功 —— jiti 能转译 workspace 内的 TS，**退路 A/B 都不需要** | AI（机器验证） | 2026-10-16 |
| `in-progress -> self-tested` | A + B1 + C 全部实现；`pnpm check` 全绿；**B1 四项探针通过**（私有组件自动渲染 / 不成路由 / 既有页面无损）；**C 三项运行时实测**（安全头 / version+commit / 生产构建无 `.map`） | AI（机器验证） | 2026-10-16 |
| `self-tested -> done`     | 交付已进 `dev` 且能指出具体提交（`63a3be2` A+C、`d824907` B1、`8bb232f` 编号预留、`98486e5` 分层文档 §9），已推送 `origin/dev`；机器验证证据在「执行与验证」表内；未验证边界已如实记录。意图验收按 `dao/README.md`「'等 Owner 看一眼'不构成不收口的理由」写入确认门 | AI（按收口规则） | 2026-10-16 |

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
| B1 用 `pathPrefix: true` **且去掉 `Components` 段** | 初判"不移植 greensketch 的名称归一"，**实测后修正**：`pathPrefix` 会把 `components` 目录名拼进组件名（得到 `ProbeComponentsProbeCard`，模板里不可用）；加 `extendComponent` 归一后为 `ProbeProbeCard`（真实场景如 `CapabilitiesCard`）—— 保留页面作用域，又不把"组件放在哪个目录"写进标签名 | AI（实测修正）   | 2026-10-16 |
| 两端 Tiptap 注释合并为一份                          | 两端讲的是同一个坑（`@tiptap/pm` 无根导出 / `prosemirror-*` 需 `@nuxt/ui >` 前缀），保留信息更全的一版                                             | AI               | 2026-10-16 |
| **模块提供的配置键只能"局部放弃静态校验"**          | `NuxtConfig` **没有索引签名**，且 `icon`（由 `@nuxt/icon`）、`routeRules`（由 `@nuxt/nitro-server` 的 `augments`）都**不在 `@nuxt/schema` 核心**里，而是由内部包/模块 `declare module` 增强 —— 这些类型不是任何可 import 的单一入口。故用 `AUGMENTED_OPTIONS` 这一个显式白名单收口，其余键仍完整受类型检查；加错键不会有编译错误，已写进代码注释警示 | AI（实测得出）   | 2026-10-16 |
| `$production` / `$development` 需 `RsNuxtConfigInput` | 它们是 **c12** 的 `C12InputConfig` 键（`$test`/`$development`/`$production`/`$env`），不在 `NuxtConfig` 上。**只在类型层加宽**，运行时 Nuxt/c12 本来就支持这些分段键                        | AI（实测得出）   | 2026-10-16 |

## 确认门与续跑（按需）

- 当前确认门：`待 Owner 意图验收`（**不阻塞 `done`** —— 按 `dao/README.md`，卡该 done 就 done，观感验收写在这里即可）
- 需要确认：本卡几乎无观感变化（主要是工程结构），只需确认两端页面没有回归
- 可接受回答：`无回归` / `有回归：<现象>`
- 确认后回到：`done`（已 done）
- 确认后第一刀：若报回归 → 开 `fix/*` 修；无回归 → 无需动作
- 已确认事实：
  - `2026-10-16` Owner 选定范围（A 共享基线 + B1 页面私有组件 + C 构建运行时基线）与「纯函数包」形态；包名由 AI 建议统一为 `@rs/config`
  - `2026-10-16` Owner 批准合入 `dev`，并同意补写分层文档 §9

## 执行与验证

只保留可复查摘要；原始日志、截图与长输出请链接到外部位置。

| 类型                 | 命令 / 样本 / 链接                                                                                | 结果                                                                                                                                                            | 仍未验证的边界                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 机器验（go/no-go）   | 建 `packages/config` → 两端 `nuxt prepare`                                                         | **通过**：jiti 直接转译 `exports` 指向的 `src/*.ts`，无需预构建 —— **退路 A（dist）与退路 B（layer）都不需要**                                                       | —                                                                           |
| 机器验（类型）       | `pnpm typecheck`（turbo）                                                                          | **9/9 通过**（含新增的 `@rs/config`）                                                                                                                            | —                                                                           |
| 机器验（质量门）     | `pnpm check`（`release-notes:check` → `format:check` → `lint` → `typecheck` → `test`）              | **全绿**；`@rs/config` 自带 **8 个单测**（专门保护"无 git / 无 package.json / JSON 损坏 / 非法 ref"下的降级行为）                                                  | —                                                                           |
| 机器验（C·安全头）   | `curl -sI http://localhost:4051/`                                                                  | 含 `x-frame-options: SAMEORIGIN` 与 `content-security-policy: frame-ancestors 'self'`                                                                            | —                                                                           |
| 机器验（C·版本注入） | SSR payload                                                                                        | `apiBase:"http://localhost:4049/api",version:"0.1.0",commit:"22081ea"`；**commit 与 HEAD 一致**                                                                  | —                                                                           |
| 机器验（C·生产）     | `pnpm --filter @rs/web build` + 统计 `.output/public` 下 `*.map`                                    | 构建成功（Σ 10.5 MB），**`.map` 计数 = 0** —— `$production` 分段实测生效                                                                                          | —                                                                           |
| 机器验（回归）       | web dev 干净启动（4051 → 200）                                                                     | `optimizeDeps` 9 条**全部可解析**（有任一条解析不到，Vite 会直接启动失败）                                                                                        | ⚠️ **富文本编辑器单实例行为未在浏览器验证**；依据是"配置逐字搬移、零改动"，非新证据 |
| 机器验（B1·探针）    | 临时建 `pages/__probe/index.vue` + `pages/__probe/components/ProbeCard.vue`（验证后已删除）          | ① `/__probe` → **200**；② HTML 含 `PROBE_CARD_RENDERED`（**不写 import 即自动渲染**）；③ `/__probe/components/ProbeCard` → **404**（未进路由表）；④ `/`、`/resume/4`、`/my-resumes` 仍 200                                                              | —                                                                           |
| 机器验（B1·踩坑）    | 首轮探针用 `<ProbeCard />`                                                                         | **失败，且是有价值的失败**：生成的名字是 `ProbeComponentsProbeCard` —— `components` 目录名被拼进了组件名。据此修正了"不移植名称归一"的初判（见「设计与决策」），加 `extendComponent` 后变为 `ProbeProbeCard`                                    | —                                                                           |
| 结构验（B1）         | 重启 dev 后重新生成 `.nuxt/components.d.ts`                                                        | 归一前 `ProbeComponentsProbeCard` → 归一后 `ProbeProbeCard`。⚠️ **改 `@rs/config` 必须重启 dev**：Nuxt 只在启动时求值 `nuxt.config`，HMR 不会重跑 hook                    | —                                                                           |
| 结构验               | 两端 `nuxt.config.ts` 行数                                                                         | web **73 → 29 行**；admin **73 → 37 行**；26 行 Tiptap 注释从"两份"变"一份"                                                                                       | —                                                                           |
| 意图验               | —                                                                                                  | **未执行**                                                                                                                                                       | 需 Owner 实看；本卡基本无观感变化，主要是工程结构                            |

## 交接

- 已完成：**A**（`@rs/config` 共享基线）+ **B1**（页面私有组件）+ **C**（构建运行时基线）全部实现并机器验证；两端 `nuxt.config.ts` 收敛完毕（**73 → 29 / 37 行**）
- 当前状态：`done`（已合入 `dev` 并推送 `origin/dev`）
- 阻塞：无
- 下一步第一刀：**本卡无未完成项**。若 Owner 实看发现回归 → 开 `fix/*` 修，其余无需动作
- 文档锚点：`AGENTS.md` §1 / §4.6、[`docs/web/03_Layers_分层约定.md`](../../docs/web/03_Layers_分层约定.md) **§9（本卡新增）**
- 集成锚点：`已 feature -> dev`（`63a3be2` → `28e9a56`，ff 合入并推送）

## 收口与沉淀

- `dao-review` 结论：`可收口` —— 三项判据齐：① 交付已进 `dev` 且能指出具体提交；② 机器验证证据在「执行与验证」表内；③ 未验证边界已如实记录
- 最终验证证据：见「执行与验证」表 —— `pnpm check` 全绿、`pnpm typecheck` 9/9、**B1 四项探针**、**C 三项运行时实测**（安全头 / version+commit / 生产构建 0 个 `.map`）
- Git / PR：**无 PR**（Owner 2026-10-16 指示直接合入 `dev`）
- 常规提交：`63a3be2`（A+C）、`d824907`（B1）、`8bb232f`（编号预留）、`98486e5`（分层文档 §9）
- Dao Commit：`不适用`（`dev` 上的普通功能推进，不是 `dev -> main` 集成边界）
- 沉淀候选：`候选观察` —— **「共享配置工厂无法静态校验模块提供的配置键」**：`NuxtConfig` 没有索引签名，而 `icon`（`@nuxt/icon`）、`routeRules`（`@nuxt/nitro-server`）等键由内部包 `declare module` 增强，不是任何可 import 的单一入口。这条对任何"多应用共用 Nuxt 配置"的仓都成立，等第二个仓复现后再判断是否归母（参照 `.dao/return-dao.md` 现有条目的成熟度门槛）
- 收口备注：
  - ⚠️ **分支名与本卡不一致**：`feat/51-rs-config` 是被动产生的 —— 建卡时另一个会话把提交落到了共享目录里同名分支 `feat/51-nuxt-config-base` 上（`AGENTS.md` §1「多会话独立 worktree」正因此才立）。合入后这两个分支都已无用途。
  - ⚠️ **提交号以 `dev` 上的为准**：合入前经历过一次 rebase（与另一窗口的 `dev` 线分叉），此前的 SHA 已作废。
  - ⚠️ **未执行的意图验收不阻塞收口**（按 `dao/README.md`），已写入「确认门与续跑」。
