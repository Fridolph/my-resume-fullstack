# 当前关键任务

- [`DAO-038` 公开站展示与发布](./tasks/DAO-038-公开站展示与发布.md) —— `self-tested`（**当前主线**；已实现并机器验证，待 Owner 桌面/移动端意图验收）：`/` 公开默认简历、`/resume/:id` 公开指定简历、作者侧整体迁到 `/my-resumes`、后端两个 `@Public()` 只读接口。**发布口径**：本轮"发布 = 能在 web 端被访问"，`isDefault`（★）即信号，**不做快照**。同轮附带：web 富文本工具栏、admin 自定义模块 CURD、admin 基础模块折叠面板。

任务卡仍是状态、目标、验证与交接的唯一事实源；本文件只指向当前任务，不复制目标、状态或证据。

> `done` 的卡（DAO-001~004、006~016、**028**、**029**、**030**、**031**、**032**、**033**）**不再列在本表**，避免指针膨胀；
> 历史、验证证据与收口记录见各自任务卡，集成锚点在卡的「交接」区。

- [`DAO-037` 简历自定义模块](./tasks/DAO-037-简历自定义模块.md) —— `in-progress`：契约 `custom` 分支 / 排布寻址 key→id / 编辑器上提 `packages/ui` / **web 接入** / **admin 接入（CURD + 折叠面板）**均已完成并验证。剩：**人工验收**，以及卡里「已知缺陷」中的工具栏 `bold` 不可见与含自定义模块页的 hydration 告警。

- [`DAO-034` 简历展示层上提](./tasks/DAO-034-简历展示层上提.md) —— `review-ready`（批 1 + 批 2 均已完成）。DAO-038 的公开页**直接复用本卡成果**（`ResumePageContainer` + 注册表）。

- [`DAO-035` 共享层治理](./tasks/DAO-035-共享层治理.md) —— `in-progress`：清理与搬移已完成。DAO-038 又新增一个共享项：`packages/ui/app/composables/useResumeThemeVariables.ts`（主题变量计算，消掉"预览简化版 / 公开页完整版"两份分叉）。

- [`DAO-036` 通用上传端点](./tasks/DAO-036-通用上传端点.md) —— `planned`（等排期）：admin 的 4 个 upload 组件依赖 `POST /api/masterData/file/multipleUpload`，**实测 404**（模板遗留路径），且这些组件**没有任何调用点**。

## 本轮新立的三张卡（2026-10-16，对应三个 Issue）

| 卡 | Issue | 内容 | 状态 |
| --- | --- | --- | --- |
| [`DAO-039` 测试体系](./tasks/DAO-039-测试体系-vitest.md) | [#48](https://github.com/Fridolph/my-resume-fullstack/issues/48) | 引入 vitest；`resume.service.test.cjs` → `.ts` 且直接 import 源码；**堵住「0 测试也全绿」** | `planned`（等确认依赖）|
| [`DAO-040` help 与 release-notes 内容](./tasks/DAO-040-help与release-notes内容.md) | [#49](https://github.com/Fridolph/my-resume-fullstack/issues/49) | 两个页面从模板占位改为**与实现一致**的真实内容（未实装的必须标注） | `planned`（可随时开工）|
| [`DAO-041` 发版管理](./tasks/DAO-041-发版管理-release-it.md) | [#50](https://github.com/Fridolph/my-resume-fullstack/issues/50) | `release-it` + `@release-it/conventional-changelog` 取代 `standard-version` | `planned`（等确认依赖）|

**共性风险**：前两张卡的验收标准都包含"**不许把未实现写成已实现**" ——
这条不是形式要求：本轮的 release-notes 现状正是模板时代的文案（"no backend yet"），
与真实实现完全脱节，属"文档撒谎"那类问题。

## 待 Owner 处理

- **意图验收（DAO-038 / DAO-037）**：公开页观感（桌面 + 移动端 + 深色）、`/my-resumes` 迁移后的手感、admin 折叠面板与工具栏是否够用。
- **集成锚点**：两次 feature → dev（`22aeb8b`、`da41e78`）仍未定锚（Dao Commit 卦象由人定）。
- **DAO-033 的发现**：历史迁移的 `setval(..., 0)` 早已由 `c43db00` 修复（见 DAO028 复盘 §18.4），此条可直接结掉。

## 质量门的一个真实缺口（2026-10-15 实测）

`apps/server` 的 Service 单元测试文件被删除后，`pnpm test` 输出 `# tests 0 / # pass 0`，
Turbo 仍报 **3/3 successful** —— **测试为零也会"全绿"**。要么恢复该测试，要么让测试脚本在
无匹配文件时失败。详见 DAO028 复盘 §18.5「质量门失效」。

## 公开站上线前的两笔（DAO-038 遗留）

1. **不存在的简历仍返回 HTTP 200**（页面已正确显示空态，`setResponseStatus(404)` 未生效）。
2. **公开页页头缺失**：品牌 / 移动端操作区还没做；旧 mock 链（`useResumeContent`、
   `ResumePageHeader`、`ResumeAccountMenu` 等）已无引用，属半迁移状态，待一并清理。
