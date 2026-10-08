# 【DAO-007】web 公开简历展示域：配置驱动 + 可插拔组件

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done`
- Owner：`昇哥确认方向（对齐旧站左右布局 + admin 的配置驱动能力）并指定 mock 来源；归枢协作执行`
- 创建日期：`2026-10-07`
- 关联：`Issue #3`（阶段一）、`#5`（阶段二）、`#7`（B 期）、`#9`（内容编辑）、`#11`（Header 瘦身）、`DAO-005`、`docs/dev/layers.md`、`docs/dev/data-layer.md`、`docs/dev/resume-display-architecture.md`、旧站参考 `/Users/fri/Desktop/personal/my-resume/apps/web/app/[locale]/_resume/*`、配置参考 `apps/admin/layers/20-comps/app/pages/demos/resume-config-layout.vue`

## 状态轨迹

| 迁移                          | 依据                                                                                                                                        | 确认者     | 日期       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| `planned -> designed`         | 已确认参考对象（旧站左右布局 + admin 配置驱动）与 mock 来源，契约边界可写清                                                                 | Owner 确认 | 2026-10-07 |
| `designed -> in-progress`     | Issue #3 已建，分支 `feat/3-web-resume-display-components` 从 `dev` 开出                                                                    | 归枢记录   | 2026-10-07 |
| `in-progress -> self-tested`  | 阶段一 / 二（PR #4、#6）、B 期（PR #8）、内容编辑（PR #10）与 Header 瘦身第 1 期（PR #12）陆续合入 dev，各期均有机器验 + 意图验证据（见下） | 归枢记录   | 2026-10-07 |
| `self-tested -> review-ready` | 交接包齐全（已完成 / 未验证边界 / 未承接项 / 文档锚点齐备），可交 Owner 判 `done`                                                           | 归枢记录   | 2026-10-07 |

## Grill：开工前对齐

- 目标：在 `apps/web/layers/11-public-resume` 建立「内容 / 布局 / 主题」三分模型 + section 注册表 + 渲染器，用 mock 数据渲染出与旧站一致的左右布局，且新增区块不需要改渲染器。
- 边界：只做展示域；只做渲染与配置读取，不做配置编辑（编辑属 admin 域）；本卡不接后端。
- 不做：不接 API、不做 i18n、不做 PDF 导出、不迁移 AI 对话、不改 `apps/admin`、不引入图表库（技能可视化先用文字/标签，图表另立卡）。
- 涉及文件 / 模块：`apps/web/layers/11-public-resume/**`（`app/types`、`app/config`、`app/mock`、`app/components/resume/*`、`app/pages/resume/index.vue`）。
- 风险与未知：① 旧站字段（`StandardResume` + 字段级 locale）与本仓「去 locale」方向不同，本卡只取内容形状；② mock 数据结构将来要能被后端快照替换，字段命名需一次定稳；③ layer 内组件的自动命名前缀需实测，避免组件解析失败。
- 验收：见 Issue #3（左右布局渲染、配置驱动顺序/显隐/主题、新增 section 只改注册表、typecheck 与 SSR 无告警、light/dark 可用）。
- 第一刀：定领域类型 → 注册表 → mock 内容与默认配置 → 渲染器 + section 外壳 → 先落 hero / highlights / education / experience / projects / skills，再校验 SSR。
- 过门判断：`可开工`。

## 设计与决策

| 决策                                                            | 理由 / 证据                                                                                         | 确认者     | 日期       |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| 内容 / 布局 / 主题三分，互不耦合                                | 布局与主题是「展示配置」，内容是「领域数据」；分开后 admin 可配置、web 只渲染                       | 归枢起草   | 2026-10-07 |
| section 统一 props（`section` / `content` / `options`）+ 注册表 | 新增区块只写组件 + 登记，渲染器不认识具体 section → 可插拔                                          | 归枢起草   | 2026-10-07 |
| 主题以 CSS 变量下发（`--resume-primary` 等）                    | 与 admin `resume-config-layout` 的变量命名一致，配置可直接复用，不必改组件                          | 归枢起草   | 2026-10-07 |
| 内容不含字段级 locale                                           | 与 `DAO-005` 已确认的领域模型方向一致；语言由 draft 承载，展示层只接收单语言内容                    | 归枢起草   | 2026-10-07 |
| 技能可视化先不引入图表库                                        | 本卡先保证结构与可插拔；charts 属独立能力，避免为了 demo 提前加依赖                                 | 归枢起草   | 2026-10-07 |
| 阶段二：页面只做编排（薄页面）                                  | 现状 `index.vue` 138 行混了顶栏 + 面板 + 编排，进页面读不出结构；拆成 Header / Settings / Container | Owner 提出 | 2026-10-07 |
| 三种布局（single / split / threeColumn）共用同一份 order + slot | 切布局不丢配置；移动端统一单列按 order 阅读                                                         | Owner 提出 | 2026-10-07 |
| 主题拆成 mode × preset 两个正交维度                             | 现有「深色科技」把明暗与配色压成一个维度，组合不自由                                                | 归枢起草   | 2026-10-07 |
| 背景独立成层，卡片之上保证可读                                  | 背景是展示能力而非内容；半透明 surface + 变量控制，任何背景下正文都清晰                             | Owner 提出 | 2026-10-07 |
| 区块组件不感知编辑态，编辑能力由外层容器注入                    | 保证同一份区块组件能同时服务 web 展示与 admin 编辑（可复用率的关键）                                | 归枢起草   | 2026-10-07 |
| 拖拽与编辑分三期（只读 → 登录编辑 → 后端入库）                  | 先稳住展示与契约，避免一次性引入鉴权 + 拖拽 + 写库                                                  | 归枢起草   | 2026-10-07 |

## 确认门与续跑

- 当前确认门：`已确认，已进入续跑`
- 需要确认：阶段二设计（见 [docs/dev/resume-display-architecture.md](../../docs/dev/resume-display-architecture.md) 第 9 节）——① 编辑能力归属；② 主题模型；③ 背景范围；④ 三栏比例；⑤ 接受 web 侧契约先扩展、admin 暂不跟进。
- 可接受回答：逐项选定；或指出需要改的设计点。
- 确认后回到：`in-progress`（阶段二编码）
- 确认后第一刀：升级类型与 mock（layout / sections / background）→ 抽 `useResumeDisplay` → 拆组件 → 三布局 + 主题 + 背景 → 验证。
- 已确认事实：Owner 已选定 **① 编辑能力归属 = web 端原地编辑（登录后，按 A/B/C 分期）**；**② 主题模型 = 保持合并式预设**（一套预设自带明暗，不做 mode × preset 拆分）；**③ 背景范围 = 纯 CSS/SVG 纹理预设 + 图片仅建模**（本轮不做上传）。另确认：三栏比例按 `1fr 4fr 1fr`（= 1/6 : 2/3 : 1/6）；接受 web 侧契约先扩展、admin 暂不跟进。已按此执行阶段二。

## 执行与验证

| 类型   | 命令 / 样本 / 链接                                                                                                                                                    | 结果                                                                                                                         | 仍未验证的边界                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 机器验 | `pnpm --filter @template/web typecheck`；`oxlint apps/web`                                                                                                            | 通过；oxlint 0 warning / 0 error                                                                                             | 全仓 `format:check` 仍是既有缺口（DAO-006）              |
| 结构验 | `layers/11-public-resume/app` 分为 types / config / mock / components / pages；渲染器不 import 任何具体区块                                                           | 通过；新增区块只需「写组件 + 在 `config/resume-sections.ts` 登记」，渲染器不用改                                             | 技能可视化的图表能力未纳入（另立卡）                     |
| 意图验 | dev server `:4021` 抓 `/resume`                                                                                                                                       | 通过；主题变量注入（`--resume-primary` 等）、左右两栏、6 个区块标题与内容 SSR 渲染                                           | 移动端断点只靠静态类保证，未逐屏实测                     |
| 意图验 | 临时改 mock 配置：`hidden=['highlights','skills']` + 反转 `order` + 深色主题，再抓 `/resume`                                                                          | 通过；隐藏项消失、顺序完全按配置、`--resume-page:rgb(3 7 18)` 生效（改完已还原）                                             | 配置编辑面板仍是 demo，正式编辑属 admin 域               |
| 机器验 | 阶段二：`pnpm --filter @template/web typecheck`；`oxlint apps/web`                                                                                                    | 通过；oxlint 0 warning / 0 error                                                                                             | 全仓 `format:check` 仍是既有缺口（DAO-006）              |
| 结构验 | 阶段二：`index.vue` 138 → 53 行（只剩编排）；`ResumeDisplayRenderer` 删除且全仓无残留引用；拆出 PageHeader / SettingsPanel / PageContainer / Column / BackgroundLayer | 通过；进页面即可读出「顶栏 + 正文容器」结构                                                                                  | 拖拽尚未接入（B 期）                                     |
| 意图验 | 阶段二：SSR 抓默认 `/resume`                                                                                                                                          | 通过；`grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]` + 固定栏 sticky + 主题变量注入                                        | —                                                        |
| 意图验 | 阶段二：临时把 mock 改成 `threeColumn` + `mesh` 纹理 + 深色主题，再抓 `/resume`                                                                                       | 通过；`lg:grid-cols-[1fr_4fr_1fr]`、背景层出现 `radial-gradient(...)`、`--resume-page:rgb(3 7 18)`                           | 图片背景仅建模，上传后置                                 |
| 意图验 | 阶段二：临时改成 `single`，再抓 `/resume`                                                                                                                             | 通过；只剩 `grid-cols-1`（无多列类），6 个区块标题仍在（profile 为 hero 卡片无标题行）                                       | 移动端断点靠静态类保证，未逐屏截图                       |
| 机器验 | B 期：`pnpm --filter @template/web typecheck`；`oxlint apps/web`                                                                                                      | 通过；oxlint 0 warning / 0 error（34 files）                                                                                 | 全仓 `format:check` 仍是既有缺口（DAO-006）              |
| 结构验 | B 期：编辑态由容器注入（`ResumeColumn` 渲染手柄与隐藏按钮），区块组件未改动                                                                                           | 通过；7 个区块组件的 props 契约保持只读、未触碰                                                                              | 拖拽手柄的视觉/可达性未做专项检查                        |
| 意图验 | B 期：SSR 抓未登录 `/resume`                                                                                                                                          | 通过；出现「管理员登录」，**无** `data-drag-handle` / 「编辑模式」文案 → SSR 不吐编辑态，水合安全                            | 登录后的客户端状态未在 SSR 断言                          |
| 意图验 | B 期：拖拽落点算法（锚点语义）用 `/tmp` 脚本跑 6 个用例（同栏上移/下移、跨栏、落末尾、原地不动）                                                                      | 通过；`applyDragResult` 的顺序与归属结果均符合预期（脚本在 /tmp，未进仓库）                                                  | 端到端拖拽需人工在浏览器验证（环境无本地 Playwright 包） |
| 机器验 | 内容编辑：`pnpm --filter @template/web typecheck`；`oxlint apps/web`                                                                                                  | 通过；oxlint 0 warning / 0 error（39 files）                                                                                 | 全仓 `format:check` 仍是既有缺口（DAO-006）              |
| 机器验 | Header 瘦身：`pnpm --filter @template/web typecheck`；`oxlint apps/web`                                                                                               | 通过；oxlint 0 warning / 0 error（42 files）                                                                                 | 全仓 `format:check` 仍是既有缺口（DAO-006）              |
| 结构验 | Header 瘦身：登录入口自带弹窗（`ResumeLoginButton`）；设置改 `ResumeSettingsDrawer` 承载，`ResumeSettingsPanel` 退化为纯内容                                          | 通过；页面不再出现登录按钮 / 弹窗 / 设置面板本体                                                                             | 入口栏（rail）属第 2 期                                  |
| 意图验 | Header 瘦身：SSR 抓 `/resume`                                                                                                                                         | 通过；品牌区回退预设（首字「厉」/ 厉飞雨 / 全栈开发 / 前端方向），操作区只有「管理员登录 + 展示设置」，设置内容不在初始 HTML | 滚动标题联动依赖客户端 IO，需人工验证                    |
| 意图验 | Header 瘦身：临时把 mock 的 `brand` 改成自定义值再抓页                                                                                                                | 通过；`LFY` / `自定义标题` / `用配置覆盖的描述` 均生效（改完已还原）                                                         | —                                                        |
| 结构验 | 内容编辑：区块编辑 schema 与展示注册表分离（`config/resume-editor-schemas.ts`）；区块组件未改动                                                                       | 通过；新增区块只有三处：展示组件 / 展示注册表 / 编辑 schema                                                                  | 富文本与字段级校验未纳入                                 |
| 意图验 | 内容编辑：`/tmp` 脚本验证字段路径读写与列表操作（嵌套路径、根级数组、列表上移 / 越界不动）                                                                            | 通过；共 9 项断言全部通过                                                                                                    | 端到端表单交互需人工验证                                 |
| 意图验 | 内容编辑：SSR 抓未登录 `/resume`                                                                                                                                      | 通过；只有「管理员登录」，无编辑入口图标（pencil / grip / eye-off）与「编辑模式」→ 水合安全                                  | 登录后表单行为未在 SSR 断言                              |

## 交接

- 已完成：阶段一（类型 / 注册表 / mock / 区块组件 / 页面初版，PR #4）；阶段二（薄页面编排、组件拆分、三种布局、纹理背景层，PR #6）；B 期（mock 登录、编辑模式、跨栏拖拽、本地保存，PR #8）；内容编辑（`useResumeContent` + schema 驱动表单 + 编辑抽屉，PR #10）；Header 瘦身第 1 期（登录组件化、设置改 Drawer、品牌可配、滚动模块名，PR #12）。
- 当前状态：`review-ready`（展示域主体与交互链路已具备，等 Owner 判 `done`）
- 阻塞：无。
- 下一步第一刀：本卡无下一步。
- 未承接项（须由别的任务承接，勿随本卡一起关闭）：① `resume-display-architecture.md` §6.1 第 2 期「入口栏 rail」——方向已确认、尚未实施；② C 期「保存接后端 + 公开快照携带配置」；③ 技能可视化图表；④ 真实浏览器端到端验证（登录 → 拖拽 → 保存 → 刷新 → 退出），环境缺本地 Playwright 包。
- 文档锚点：`docs/dev/resume-display-architecture.md`、`docs/dev/layers.md`、`docs/dev/data-layer.md`、`Issue #3 / #5 / #7 / #9 / #11`
- 集成锚点：`已集成（各期经 PR #4 / #6 / #8 / #10 / #12 合入 dev）`

## 收口与沉淀

- `dao-review` 结论：`可收口（本卡交付已全部合入 dev；done 由 Owner 确认）`
- 最终验证证据：各期机器验（`pnpm --filter @template/web typecheck`、`oxlint apps/web` 0 warning / 0 error）与意图验（SSR 抓 `/resume`、临时改 mock 验证配置驱动、`/tmp` 脚本验证拖拽落点与字段路径）见上表；原始输出与 PR 级说明在 PR #4 / #6 / #8 / #10 / #12。
- Git / PR：`PR #4（9d1a200）、#6（ba321be）、#8（5b2ba1b）、#10（3af8d05）、#12（7fd33f0）`
- 常规提交：`已关联（上述 SHA）`
- Dao Commit：`不适用（各期按 feat -> dev 集成，标题形式为 [Feat] …，未使用卦象锚点）`
- 沉淀候选：`候选观察`——「可插拔展示域 = 注册表 + 统一 props 契约 + 编辑能力外置」在 4 期迭代里始终成立：新增区块只动三处（展示组件 / 注册表 / 编辑 schema），7 个区块组件从未因拖拽或内容编辑而改动。是否跨项目成立（尤其 React 版）待第二仓验证。
- 收口备注：① 本卡同时验证「展示域与 admin 配置域共享同一份布局契约」这一判断，但 web 侧契约已先扩展（`brand` 等），与 admin 的 `useResumeLayout` 仍处分叉期，收敛时机另定；② 全仓 `format:check` 缺口由 DAO-006 单独处理。

## 收口记录（2026-10-08）

- 状态 `review-ready -> done`：交付已合入 `dev`（见「交接 → 集成锚点」），验证证据与未验证边界均在本卡内可查。
- 依据：Owner 于 2026-10-08 要求「任务完成后立即检查并收口 Issue 与任务卡，避免积累」，据此判 `done`。
  卡内已如实标注的未验证边界（如浏览器目视、端到端交互）**不阻塞收口**，另行统一安排。
