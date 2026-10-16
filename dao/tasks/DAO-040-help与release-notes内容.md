# 【DAO-040】help 与 release-notes 写入真实内容

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`planned`
- Owner：`昇哥（2026-10-16：希望将更新内容对应写到 apps/admin/app/pages/help.vue、release-notes.vue 之中）`
- 创建日期：`2026-10-16`
- 分支：待建 `docs/49-help-release-notes`
- Issue：[#49](https://github.com/Fridolph/my-resume-fullstack/issues/49)
- 关联：`DAO-038`（公开站与发布，本轮新增能力）、`DAO-037`（自定义模块）、`DAO-036`（挂起的上传端点）

## 目标与边界

- 目标：两个页面从**模板占位**改为**与当前实现一致**的真实内容（中文为主）。
- 范围：只改这两个页面的内容与数据结构（沿用既有 `docs` 布局与锚点导航）。
- 非目标：不做 i18n；不新增页面；不把 `docs/` 整段复制进页面（页面是**导读**，深入内容指向文档）。

## 现状（已核实）

| 页面 | 事实 |
| --- | --- |
| `apps/admin/app/pages/help.vue` | 101 行，英文模板文案 + 5 个锚点（Overview / Getting started / Key modules / AI assistant / Resources），内容与实现不符 |
| `apps/admin/app/pages/release-notes.vue` | 116 行，`releases` 数组写的是模板时代的事（"demo flow, no backend yet"、"Layers, component library & uploads"） |

## 内容口径（关键约束）

1. **只写已实现的**，逐条可回溯到提交或任务卡；不确定的**删掉而不是猜**。
2. 未实装的必须明确标注：
   - `/ai-talk` 目前**只有入口与骨架**，能力未实装；
   - 通用上传端点（DAO-036）**未实现**，admin 的 4 个 upload 组件**没有调用点**；
   - 旧的 `TextEditor` **已移除**，编辑器改为 Nuxt UI 的 `UEditor`。
3. release notes 按真实提交补齐（0.3.0 unreleased：公开站与发布 + 自定义模块 + 编辑体验）。
4. Dev notes 记本轮真实结论（Vite 预打包导致 Tiptap 多实例 / SSR 下 `useAsyncData` 吞掉 404 语义 /
   页面根模板不能写具名插槽 / 样式配置留浏览器不入库）。
5. Roadmap 至少含挂起项：上传端点 DAO-036、测试体系 #48、发布管理 #50。

## 验收标准

- 两个页面每条内容都能对照 `git log` 或 `dao/tasks/*` 核验。
- **无任何"计划中"被写成已完成**。
- 锚点导航与章节一一对应；桌面与移动端均可读。
- `pnpm typecheck` / `lint` / `format:check` 全绿。

## 测试计划（按风险）

| 风险 | 验证 |
| --- | --- |
| 写成愿景而非事实 | 逐条回溯来源；回溯不到的删掉 |
| 锚点失效 | 逐个点导航确认跳转 |
| 移动端排版 | 375px 宽实看 |

## 交接

- 已完成：现状核实、内容口径与验收标准
- 当前状态：`planned`
- 阻塞：无（可随时开工）
- 下一步第一刀：按 release notes 的版本结构，从最近 14 个提交整理真实条目
- 文档锚点：`dao/tasks/DAO-038-公开站展示与发布.md`、`docs/dev/05_全栈简历项目_DAO028学习复盘.md`
- 集成锚点：`待 feature -> dev`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：待补
- Git / PR：待补
- Dao Commit：`不适用`
- 沉淀候选：`无`
- 收口备注：
