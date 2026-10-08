# 【DAO-019】MyFullScreenGallery 改用 UModal fullscreen

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done`
- Owner：`昇哥（判定原生 dialog 封装多余，要求改用 Nuxt UI 的 fullscreen 模式）`
- 创建日期：`2026-10-08`
- 关联：`Issue #28`、`DAO-017`（`My` 前缀 / `$attrs` 透传约定）、`DAO-013`（packages/ui 共享 layer）

## 状态轨迹

| 迁移                      | 依据                                                                                     | 确认者     | 日期       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ---------- |
| `planned -> designed`     | 诉求明确：改用 `UModal fullscreen`，去掉原生 `<dialog>` 与大量原生 CSS；**保持现有 API 与 mock 数据可用** | Owner 确认 | 2026-10-08 |
| `designed -> in-progress` | `Issue #28` 已建；分支 `feat/28-gallery-umodal` 从 `dev` 开出                             | 归枢记录   | 2026-10-08 |
| `in-progress -> self-tested` | 组件重写（316 → 128 行，无 `<style>`）；示例页与 3 份文档同步；浏览器实测通过           | 归枢记录   | 2026-10-08 |
| `self-tested -> done`     | Owner 确认提交范围后分类提交并推送；`Issue #28` 回填关闭                                  | Owner 确认 | 2026-10-08 |

## Grill：开工前对齐

- 目标：① 组件改为基于 `UModal fullscreen`；② 原生 CSS 全换 Tailwind（只有 media / 复杂动画才留 `<style>`）；③ **API 与 mock 数据不变**（`v-model:open` / `title` / `description` / `items` / `emptyText`），调用方零改动；④ 同步 `/comps/full-screen-modal` 与 README。
- 边界：只动组件本体、两个 admin 示例页、`packages/ui/README.md`、`docs/dev/resume-styles.md` §15.6。
- 不做：不删组件（它装的是"图集浏览"的业务语义，不是 UModal 薄壳）；不改调用方；不改 hero 的兴趣数据结构。
- 风险与未知：`UModal` 的 `fullscreen` 与 `#body` 高度/内边距的配合（未知）；"点空白关闭"在全屏形态下没有遮罩可点。
- 验收：见 `Issue #28`。
- 第一刀：先重写组件本体，再用现有示例页回归。
- 过门判断：`可开工`。

## 设计与决策

| 决策 | 理由 / 证据 | 确认者 | 日期 |
| ---- | ----------- | ------ | ---- |
| **保留组件**（不让调用方直接用 `UModal`） | 它承载「一组图片怎么摆、怎么点」的业务语义（`items` 契约 + caption + 外链角标 + 空态）；调用方只需 `v-model:open` + `items` | 归枢起草 | 2026-10-08 |
| **保留深色衬底**（不跟随业务主题） | lightbox 惯例：图片在任何主题下都该有稳定背景；标题 / 说明 / 关闭按钮相应覆写白色系 | 归枢起草（沿用原设计意图） | 2026-10-08 |
| 「点空白关闭」按**点到什么**判断 | `fullscreen` 形态没有遮罩可点（面板铺满），必须排除卡片 / 链接 / 图片 / caption | 归枢记录 | 2026-10-08 |
| 字号一律用 `text-[…]` 精确值 | `text-sm` 之类**自带行高**，会改变原有行高（`hero/parts` 重构时实测踩到） | 归枢记录 | 2026-10-08 |
| `ui.body` 必须写 `sm:p-0` | `UModal` 的 body 默认带 `sm:p-6`，只写 `p-0` 在桌面端被它盖住 → body 四周留 24px，**点在那一圈不属于内容区，「点空白关闭」失效** | 归枢记录（实测缺陷） | 2026-10-08 |
| 模板内联对象**不写 `//` 注释** | `:ui="{…}"` 整段被当表达式解析，行注释会把后面剩的对象字面量一起注释掉 → 直接 500 | 归枢记录（实测缺陷） | 2026-10-08 |

## 执行与验证

| 类型   | 命令 / 样本 / 链接 | 结果 | 仍未验证的边界 |
| ------ | ------------------ | ---- | -------------- |
| 机器验 | `oxlint apps/web apps/admin packages`；两端 `typecheck` | 0 warning / 0 error（223 files）；两端通过 | — |
| 结构验 | 组件行数 / `<style>` / `<dialog>` | **316 → 128 行**；`<style>` 块 **0**；无原生 `<dialog>` / `showModal` | — |
| 意图验 | 真浏览器（playwright + 本机 chromium）打开三类图集 | **全过**：全屏 rect `[0,0,1280,800]`；4 张卡片全部 `target=_blank` + `rel=noreferrer`；4 个 caption（首个「第一张」）；`aspect-ratio: 4/3`；深色底 `oklch(0.129 0.042 264.695)`；标题与关闭按钮齐 | — |
| 意图验 | 关闭路径 | **Esc ✓**；**点空白 ✓**（修复 `sm:p-0` 后）；关闭按钮由 UModal 提供 | — |
| 意图验 | 纯展示 / 空态 / 窄屏 | 纯展示：锚点 **0** 个、caption 2、图片 3 ✓；空态文案「暂无图片」✓；375px 全屏 `[375,720]` 且**无横向溢出** ✓ | 空态在最后一次批量脚本里因选择器（按 `img` 判定）未复现，但前一次已单独验证 |
| 意图验 | console | 无 error / warning ✓ | — |

## 交接

- 已完成：组件重写为 `UModal fullscreen`（API 不变）；`/comps/full-screen-modal` 与 `/demos/hobby-modal` 两个示例页可用；`packages/ui/README.md`、`docs/dev/resume-styles.md` §15.6 的"原生 dialog"说法全部更新。
- 当前状态：`done`
- 阻塞：无。
- 下一步第一刀：无（本卡收口）。后续若要让 gallery **跟随业务主题**，只需去掉 `ui.content` 的深色覆写与白色系覆写（一处改动）。
- 文档锚点：`Issue #28`、`packages/ui/README.md`、`docs/dev/resume-styles.md` §15.6
- 集成锚点：`已推送 origin/dev（d3ceb29）`

## 收口与沉淀

- `dao-review` 结论：`可收口（质量门 + 结构 + 三类图集与三条关闭路径的实测均通过）`
- 最终验证证据：见「执行与验证」表
- Git / PR：`本地分类提交并推送：c2976c5 / 42039ff / d3ceb29（曾用 force-with-lease 整理过一次提交消息）`
- 常规提交：`c2976c5（fix MyDrawer）/ 42039ff（refactor gallery）/ d3ceb29（docs 开发约定）`
- Dao Commit：`不适用`
- 沉淀候选：`候选观察` —— 「**能用库的现成模式，就不要自己维护一套**」：`UModal fullscreen` 一个属性替掉了 ~185 行自定义 CSS + 一套手写的焦点/惰性/过渡逻辑。加上本轮实测出来的两个坑（库组件的默认内边距会盖住你的覆盖类；模板内联对象里不能写行注释），构成"用组件库时要先看清它的默认类"的判据。
- 流程失误（如实记录）：分类提交时误用 `git commit --amend`（当时 HEAD 已是 docs 那条），导致**消息与内容错位**且丢掉一条消息。因刚推送、无他人依赖，经 Owner 确认后用「软重置 + 重新分类提交 + `--force-with-lease`」重写为三条干净提交，并用 `git diff <旧dev> <新dev>` **验证内容逐字节一致**（输出为空）后才推送。教训：`--amend` 只该在确认 HEAD 是目标提交时使用；整理历史前必须先证明"只是消息变了"。
- 收口备注：本轮 3 个坑里 2 个是**我自己在写注释/覆写类时引入的**，且 `typecheck` / `oxlint` **全都抓不到**（一个要跑编译才 500，一个要点到空白才失效）—— 与 `AGENTS.md` §4 那条"机器验证只证明没坏、不证明对"完全吻合。
