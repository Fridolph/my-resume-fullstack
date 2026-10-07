# 【DAO-007】web 公开简历展示域：配置驱动 + 可插拔组件

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`in-progress`
- Owner：`昇哥确认方向（对齐旧站左右布局 + admin 的配置驱动能力）并指定 mock 来源；归枢协作执行`
- 创建日期：`2026-10-07`
- 关联：`Issue #3`、`DAO-005`、`docs/dev/layers.md`、`docs/dev/data-layer.md`、旧站参考 `/Users/fri/Desktop/personal/my-resume/apps/web/app/[locale]/_resume/*`、配置参考 `apps/admin/layers/20-comps/app/pages/demos/resume-config-layout.vue`

## 状态轨迹

| 迁移                    | 依据                                                                                     | 确认者     | 日期       |
| ----------------------- | ---------------------------------------------------------------------------------------- | ---------- | ---------- |
| `planned -> designed`   | 已确认参考对象（旧站左右布局 + admin 配置驱动）与 mock 来源，契约边界可写清              | Owner 确认 | 2026-10-07 |
| `designed -> in-progress` | Issue #3 已建，分支 `feat/3-web-resume-display-components` 从 `dev` 开出                | 归枢记录   | 2026-10-07 |

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

| 决策                                                     | 理由 / 证据                                                                             | 确认者   | 日期       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ---------- |
| 内容 / 布局 / 主题三分，互不耦合                          | 布局与主题是「展示配置」，内容是「领域数据」；分开后 admin 可配置、web 只渲染            | 归枢起草 | 2026-10-07 |
| section 统一 props（`section` / `content` / `options`）+ 注册表 | 新增区块只写组件 + 登记，渲染器不认识具体 section → 可插拔                           | 归枢起草 | 2026-10-07 |
| 主题以 CSS 变量下发（`--resume-primary` 等）             | 与 admin `resume-config-layout` 的变量命名一致，配置可直接复用，不必改组件               | 归枢起草 | 2026-10-07 |
| 内容不含字段级 locale                                     | 与 `DAO-005` 已确认的领域模型方向一致；语言由 draft 承载，展示层只接收单语言内容          | 归枢起草 | 2026-10-07 |
| 技能可视化先不引入图表库                                 | 本卡先保证结构与可插拔；charts 属独立能力，避免为了 demo 提前加依赖                      | 归枢起草 | 2026-10-07 |

## 执行与验证

| 类型   | 命令 / 样本 / 链接                                                                    | 结果                                                                             | 仍未验证的边界                                   |
| ------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| 机器验 | `pnpm --filter @template/web typecheck`；`oxlint apps/web`                            | 通过；oxlint 0 warning / 0 error                                                 | 全仓 `format:check` 仍是既有缺口（DAO-006）      |
| 结构验 | `layers/11-public-resume/app` 分为 types / config / mock / components / pages；渲染器不 import 任何具体区块 | 通过；新增区块只需「写组件 + 在 `config/resume-sections.ts` 登记」，渲染器不用改 | 技能可视化的图表能力未纳入（另立卡）             |
| 意图验 | dev server `:4021` 抓 `/resume`                                                       | 通过；主题变量注入（`--resume-primary` 等）、左右两栏、6 个区块标题与内容 SSR 渲染 | 移动端断点只靠静态类保证，未逐屏实测             |
| 意图验 | 临时改 mock 配置：`hidden=['highlights','skills']` + 反转 `order` + 深色主题，再抓 `/resume` | 通过；隐藏项消失、顺序完全按配置、`--resume-page:rgb(3 7 18)` 生效（改完已还原）   | 配置编辑面板仍是 demo，正式编辑属 admin 域       |

## 交接

- 已完成：领域类型（内容 / 布局 / 主题三分 + `ResumeSectionProps` 契约）；区块注册表；mock（`resume-content.zh` + `resume-display`）；7 个区块组件与 `ResumeSectionCard` 外壳；`ResumeDisplayRenderer` 渲染器；`/resume` 页面与「展示设置」面板；SSR 与配置驱动验证。
- 当前状态：`in-progress`
- 阻塞：无。
- 下一步第一刀：把 admin 侧的布局配置生成 → web 渲染打通（同一份 `ResumeDisplayConfig` 契约），验证「配置域与展示域同构」这一判断。
- 文档锚点：`Issue #3`、`docs/dev/layers.md`、`docs/dev/data-layer.md`
- 集成锚点：`待 feat/3-* -> dev`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：`待补`
- Git / PR：`待补`
- 常规提交：`待补`
- Dao Commit：`不适用`
- 沉淀候选：`无`
- 收口备注：本卡同时验证「展示域如何与 admin 配置域共享同一份布局契约」这一判断是否站得住。
