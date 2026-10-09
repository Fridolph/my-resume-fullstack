# 【DAO-008】web 简历页风格维度（`minimal` / `standard`）

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done`
- Owner：`昇哥逐项确认设计与范围（9 项）；归枢协作执行`
- 创建日期：`2026-10-07`
- 关联：`Issue #13`、`DAO-007`（展示域本体，review-ready）、`docs/web/07_简历风格_三档实现.md`（本卡设计稿）、`docs/web/06_简历展示_架构设计.md`、旧站参考 `/Users/fri/Desktop/personal/my-resume/apps/web/app/[locale]/_resume/*`、旧站契约 `/Users/fri/Desktop/personal/my-resume/packages/api-client/src/types/resume.types.ts`、机制参考 `/Users/fri/Desktop/greensketch-basic/app/pages/projects/[projectId]/@components/proposal/layout/{ProposalModuleList.vue,templates/*}`

## 状态轨迹

| 迁移                          | 依据                                                                                                                                                            | 确认者     | 日期       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| `planned -> designed`         | Owner 逐项确认 9 项设计决策（命名为 `style`、只做两档、token 为主 + variant 只做结构差异、贴合旧站 hero、翻牌不跳转等），设计稿定稿 `docs/web/07_简历风格_三档实现.md` | Owner 确认 | 2026-10-07 |
| `designed -> in-progress`     | Issue #13 已建；分支 `feat/13-resume-style-dimension` 从 `dev` 开出；前置 DAO-007 已收口到 review-ready                                                         | 归枢记录   | 2026-10-07 |
| `in-progress -> self-tested`  | P1 编码完成（类型 / mock / 注入层 / 组件变体 / 多段编辑 schema / 图标依赖），typecheck、oxlint、SSR 两档抓页与「风格 × 主题」组合均通过                         | 归枢记录   | 2026-10-07 |
| `self-tested -> review-ready` | 交接包齐全（已完成 / 未验证边界 / 未承接项 / 文档锚点）；四个提交在 `feat/13-resume-style-dimension` 就绪，等 Owner 判集成                                      | 归枢记录   | 2026-10-07 |

## Grill：开工前对齐

- 目标：新增与「编排」「配色」正交的**风格维度** `ResumeDisplayConfig.style.id`（本轮 `minimal` | `standard`）；`standard` 向旧站 hero 与区块外壳贴合；实现手段为「风格 token（CSS 变量）为主 + `variant` prop 只做结构差异」；内容模型补 `profile.hero` / `links` / `interests` 并在编辑抽屉可编辑。
- 边界：只改 `apps/web/layers/11-public-resume`、`apps/web/package.json`（新增 `@iconify-json/ri`）与 `docs/dev`；不改 `apps/admin`、不接后端。
- 不做：`cool` 风格（不进类型）、整页模板组件、头像跳转与 AI 对话入口、`contact` 的 key / 结构变更、图片上传、`publishedAt`、PDF、i18n、技能图表。
- 涉及文件 / 模块：`types/resume.ts`、`mock/resume-display.ts`、`mock/resume-content.zh.ts`、`config/resume-editor-schemas.ts`、`config/resume-sections.ts`（只读，不改语义）、`composables/useResumeDisplay.ts`、`components/resume/{ResumeHeroCard,ResumeSectionCard,7 个 *Section,ResumePageContainer,ResumeColumn,ResumeSettingsPanel}.vue`、`components/resume/editors/{ResumeSchemaForm,ResumeFieldInput}.vue`、`ResumeSectionEditorDrawer.vue`；样式走 `ResumeSectionCard` / `ResumeHeroCard` 内的 scoped 样式，**不新增独立 CSS 文件**。
- 风险与未知：① **旧站 CSS 把颜色烘死**（`rgba(96,165,250,.1)`、`#2563eb`），照抄会让「风格 × 主题」打架 —— 必须全部走 `--resume-*` + `color-mix`；② `variant` 透传多一跳（区块组件 → `ResumeSectionCard`），漏了会导致"外壳风格不变而 hero 变了"的半成品；③ 多段 schema 是一次内部契约改动，需连带改表单与抽屉；④ `@iconify-json/ri` 是新增依赖，需确认 Nuxt Icon 按需 bundle 后的体积；⑤ `hero.*ImageUrl` 只建模，无图时的回退必须实测。
- 验收：见 `docs/web/07_简历风格_三档实现.md` §9（typecheck / oxlint / SSR 两档产物差异 / 4 套主题 × 2 种风格无残色 / 编辑在两种风格下可用 / reduced-motion 降级 / 375px 不溢出）。
- 第一刀：类型与 mock 升级（`ResumeStyleId`、`style`、`profile.hero/links/interests`）→ `typecheck` 过。
- 过门判断：`可开工`（设计已逐项确认，确认门已完成）。

## 设计与决策

设计稿全文见 [`docs/web/07_简历风格_三档实现.md`](../../docs/web/07_简历风格_三档实现.md)（含三层落点、贴合清单、硬约束、验收清单）。只记改变实现方向的结论：

| 决策                                                                                                                 | 理由 / 证据                                                                                         | 确认者     | 日期       |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| 风格命名 `style`（`ResumeStyleId`）                                                                                  | 与 `theme`（颜色）/ `layout`（编排）语义分得最开；`template` 已被 Nuxt layer、admin demo、GS 占用   | Owner 确认 | 2026-10-07 |
| 本轮只实现 `minimal` / `standard` 两档                                                                               | `ResumeStyleId` 会进公开快照，塞入未实现枚举会让前后端校验对不上                                    | Owner 确认 | 2026-10-07 |
| token 为主，`variant` 只做结构差异                                                                                   | 视觉参数走变量 → 区块组件只消费变量，与既有 `--resume-*` 机制同构；只有 DOM 结构不同处才用 prop     | Owner 确认 | 2026-10-07 |
| `standard` 贴合旧站 hero（含 hero / links / interests 新字段）                                                       | Owner 选择最大还原范围；字段按本仓「去 locale」方向落成 `string`                                    | Owner 确认 | 2026-10-07 |
| 翻牌头像只做视觉、不接跳转                                                                                           | 旧站头像是 `/ai-talk` 的 AI 对话入口，属 `12-ai-talk`；feature layer 间不得互 import（`docs/web/03_Layers_分层约定.md`） | Owner 确认 | 2026-10-07 |
| 图标沿用旧站 iconify 名，新增 `@iconify-json/ri`                                                                     | 保留与旧站内容的可对照性；Nuxt Icon 按需 bundle                                                     | Owner 确认 | 2026-10-07 |
| 编辑 schema 改为多段（`segments`）                                                                                   | `profile` 需要 fields + 两个 list 共存，现有单 `mode` 承载不了                                      | Owner 确认 | 2026-10-07 |
| `contact` 结构与 key 不动，只改外观                                                                                  | 加 `website` 会牵动 `ResumeContactItem` / mock / 编辑 schema，与本轮目标无关                        | Owner 确认 | 2026-10-07 |
| `publishedAt` 不进 `ResumeContent`                                                                                   | 属快照级元信息（C 期后端发布快照的职责），塞进内容模型会让"内容"与"发布"混层                        | 归枢起草   | 2026-10-07 |
| 默认 `style.id = minimal`                                                                                            | 保证默认观感不变，切风格是显式动作                                                                  | 归枢起草   | 2026-10-07 |
| 动效补 `prefers-reduced-motion` 降级，并以 `@media (hover: hover)` 守卫                                              | 旧站未做降级；成本极低且属可访问性底线                                                              | 归枢起草   | 2026-10-07 |
| hover / 3D 落组件 scoped 样式，颜色仍取 `--resume-*`                                                                 | 伪类与 3D 变换无法用变量表达；但颜色不硬编码才能保证「风格 × 主题」正交                             | 归枢起草   | 2026-10-07 |
| **未来约束**：若 P2 引入整页模板，模板只能决定骨架与外壳，区块列表仍由 `ResumeColumn` 按同一份 `order` / `slot` 渲染 | GS 靠 CSS `order` 摆位，我们靠真实 DOM 顺序；照搬会让整页模板写死摆位，与拖拽/编排冲突              | 归枢起草   | 2026-10-07 |

## 确认门与续跑

- 当前确认门：`已确认，已进入续跑`
- 需要确认：设计稿 9 项（还原范围 / 实现手段 / 命名 / 翻牌交互 / 图标来源 / 编辑侧承载 / `cool` 枚举 / `contact` 边界 / 流程顺序）。
- 已确认事实：Owner 选定 **① 还原范围 = 尽量贴合旧站 hero（含动画与新增字段）**；**② 实现手段 = token 为主 + `variant` 只做结构差异**；**③ 命名 = `style` / `ResumeStyleId`**；**④ 翻牌头像 = 只做视觉、不接跳转**；**⑤ 图标 = 新增 `@iconify-json/ri`、沿用旧站 iconify 名**；**⑥ 编辑侧 = 扩展 schema 支持多段**；**⑦ `cool` 不进本轮类型**；**⑧ `contact` 结构与 key 不动**；**⑨ 流程 = 先收口 DAO-007，再开本卡**。已按此执行。

## 执行与验证

| 类型   | 命令 / 样本 / 链接                                                                                                                                                                      | 结果                                                                                                                                                                                                                                                                                                                                     | 仍未验证的边界                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 机器验 | `pnpm --filter @template/web typecheck`；`oxlint apps/web`                                                                                                                              | 通过；oxlint 0 warning / 0 error（42 files）；Nuxt Icon 报「discovered local-installed 2 collections: lucide, ri」                                                                                                                                                                                                                       | 全仓 `format:check` 仍是既有缺口（DAO-006）                                                         |
| 结构验 | 风格实现分三层落点：注入层（`ResumePageContainer.styleVars` + `data-resume-style`）／消费层（`ResumeSectionCard`、`ResumeHeroCard`）／透传层（`ResumeColumn` + 7 个 `*Section` 各一行） | 通过；`variant` 只在 2 个组件里分支，未扩散到其它组件逻辑；区块组件未感知编辑态                                                                                                                                                                                                                                                          | `standard` 的视觉与旧站仍是"贴近"，非逐像素还原                                                     |
| 意图验 | SSR 抓默认 `/resume`（`minimal`）                                                                                                                                                       | 通过；`data-resume-style="minimal"`、`--resume-card-radius:1rem`、`--resume-card-bg:var(--resume-surface)`、无 `flip`、无告警；6 个区块标题齐全                                                                                                                                                                                          | 移动端断点未逐屏截图                                                                                |
| 意图验 | 临时把 mock 改成 `standard` 再抓 `/resume`                                                                                                                                              | 通过；`data-resume-style="standard"`、`--resume-card-radius:1.5rem`、`--resume-title-size:1.5rem`、卡片渐变底全为 `color-mix` 派生；hero 出现翻牌结构 + 「talk with me ...」徽标 + slogans + Intro/Contact/Links/Interests 四段；links / interests 内容与 `ri:` 图标名均渲染（`iconify i-ri:…`，与 lucide 同机制）；无告警（改完已还原） |
| 意图验 | 临时改成 `standard` + `theme=forest`（绿色清新）再抓 `/resume`                                                                                                                          | 通过；`--resume-primary:#2f9e63`，卡片底仍引用 `var(--resume-primary)`；产物内无 `rgb(96 165 250)` / `#2563eb` 之类旧站硬编码蓝（改完已还原）                                                                                                                                                                                            | 未穷举 4 套主题 × 2 种风格的 8 种组合（`#1578d0` 仅剩 header 的 `var() fallback`，非硬编码使用）    |
| 意图验 | SSR 抓未登录 `/resume`（两档各一次）                                                                                                                                                    | 通过；无 `data-drag-handle` / 无「编辑模式」文案 → 编辑态未泄漏到 SSR                                                                                                                                                                                                                                                                    | 登录后的表单与拖拽未在浏览器实测（环境无本地 Playwright 包）                                        |
| 结构验 | 多段编辑 schema：`profile` 四段（基础信息 / 主视觉 / 个人链接 / 兴趣），`listPath` 支持点号路径                                                                                         | 通过；`ResumeSchemaForm` 按段解析 root / items，抽屉不再持有 `listItems`                                                                                                                                                                                                                                                                 | 未在浏览器实测 links / interests 的增删改交互                                                       |
| 意图验 | 真实浏览器加载：`playwright@1.58.0`（匹配本机浏览器缓存）起 chromium，以 1280×900 与 375×812 打开 `standard` 状态并整页截图                                                             | 通过；两档均加载成功并有内容产出（desktop 整页 2626px 高）→ SSR + hydration 未崩、无运行时报错                                                                                                                                                                                                                                           | 本机未配置图像理解模型：**截图的视觉正确性没有人或模型看过**；与旧站的贴合度只由结构 / 变量断言支撑 |
| 机器验 | 徽标定位修正后再跑 `oxlint apps/web`                                                                                                                                                    | 通过；0 warning / 0 error                                                                                                                                                                                                                                                                                                                | 窄栏（三栏模式约 190px）下的徽标位置只用几何估算，未在浏览器度量                                    |

## 交接

- 已完成：设计定稿（`docs/web/07_简历风格_三档实现.md`，含实现落点与硬约束）；P1 编码第一刀与第二刀全部落地 —— 类型 / mock 升级、风格 token 注入层、`ResumeSectionCard` 与 `ResumeHeroCard` 的 `minimal` / `standard` 变体、7 个区块组件 `variant` 透传、多段编辑 schema（含 `profile` 四段）、设置抽屉「风格」按钮组、`@iconify-json/ri`；徽标窄栏溢出修正；DAO-007 收口到 `review-ready`。
- 当前状态：`review-ready`（分支 `feat/13-resume-style-dimension` 上提交就绪：设计定稿 / 功能实现 / 文档回填 / 徽标修正 / 本卡回填）
- 阻塞：无。
- Owner 决定（2026-10-07）：**① 暂不推远端**（提交全部留在本地分支，由 Owner 择时集成）；**② UI 目视延后**——与 P2 的 `cool` 一起做，本轮的未验证边界保留在"执行与验证"表里，不当作已验证。
- 下一步第一刀：Owner 择时集成时走 `feat/13-* -> dev`（开 PR 或本地 squash），并回填 Issue #13；集成前如需视觉复核，可用本机缓存的 chromium（`playwright@1.58`）截图或度量。
- 未承接项：P2 的 `cool` 风格（含是否引入整页模板组件）、P3 的 admin 侧风格选择与公开快照打通、UI 目视与 375px / 窄栏复核、登录后编辑与拖拽的端到端。
- 文档锚点：`Issue #13`、`docs/web/07_简历风格_三档实现.md`、`docs/web/06_简历展示_架构设计.md`
- 集成锚点：`待 feat/13-* -> dev（Owner 择时）`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：`待补（见上表：typecheck / oxlint / SSR 两档 + 风格 × 主题组合）`
- Git / PR：`待补`
- 常规提交：`待补`
- Dao Commit：`不适用`
- 沉淀候选：`无`
- 收口备注：本卡验证的假设「风格作为正交维度能否不把区块组件写脏」已成立：`variant` 只在 `ResumeSectionCard` / `ResumeHeroCard` 两处分叉，其余 5 个区块组件只多了一行透传，没有出现"每个组件都要判断风格"的扩散；颜色全部走 `--resume-*`（含 `color-mix` 派生），所以「风格 × 主题」两个维度没有互相污染。待第二个实现（React 版）验证是否同样成立。

## 收口记录（2026-10-08）

- 状态 `review-ready -> done`：交付已合入 `dev`（见「交接 → 集成锚点」），验证证据与未验证边界均在本卡内可查。
- 依据：Owner 于 2026-10-08 要求「任务完成后立即检查并收口 Issue 与任务卡，避免积累」，据此判 `done`。
  卡内已如实标注的未验证边界（如浏览器目视、端到端交互）**不阻塞收口**，另行统一安排。
