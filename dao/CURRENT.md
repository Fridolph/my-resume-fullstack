# 当前关键任务

- [`DAO-038` 公开站展示与发布](./tasks/DAO-038-公开站展示与发布.md) —— `self-tested`（**当前主线**；已实现并机器验证，待 Owner 桌面/移动端意图验收）：`/` 公开默认简历、`/resume/:id` 公开指定简历、作者侧整体迁到 `/my-resumes`、后端两个 `@Public()` 只读接口。**发布口径**：本轮"发布 = 能在 web 端被访问"，`isDefault`（★）即信号，**不做快照**。同轮附带：web 富文本工具栏、admin 自定义模块 CURD、admin 基础模块折叠面板。

任务卡仍是状态、目标、验证与交接的唯一事实源；本文件只指向当前任务，不复制目标、状态或证据。

> `done` 的卡（DAO-001~004、006~016、**028**、**029**、**030**、**031**、**032**、**033**、**039**、**040**、**042**）**不再列在本表**，避免指针膨胀；
> 历史、验证证据与收口记录见各自任务卡，集成锚点在卡的「交接」区。

- [`DAO-037` 简历自定义模块](./tasks/DAO-037-简历自定义模块.md) —— `in-progress`：契约 `custom` 分支 / 排布寻址 key→id / 编辑器上提 `packages/ui` / **web 接入** / **admin 接入（CURD + 折叠面板）**均已完成并验证。剩：**人工验收**，以及卡里「已知缺陷」中的工具栏 `bold` 不可见与含自定义模块页的 hydration 告警。

- [`DAO-034` 简历展示层上提](./tasks/DAO-034-简历展示层上提.md) —— `review-ready`（批 1 + 批 2 均已完成）。DAO-038 的公开页**直接复用本卡成果**（`ResumePageContainer` + 注册表）。

- [`DAO-035` 共享层治理](./tasks/DAO-035-共享层治理.md) —— `in-progress`：清理与搬移已完成。DAO-038 又新增一个共享项：`packages/ui/app/composables/useResumeThemeVariables.ts`（主题变量计算，消掉"预览简化版 / 公开页完整版"两份分叉）。

- [`DAO-036` 通用上传端点](./tasks/DAO-036-通用上传端点.md) —— `planned`（等排期）：admin 的 4 个 upload 组件依赖 `POST /api/masterData/file/multipleUpload`，**实测 404**（模板遗留路径），且这些组件**没有任何调用点**。

## 可观测性（2026-10-16 新立，对应 #52 / #53）

| 卡 | Issue | 内容 | 状态 |
| --- | --- | --- | --- |
| [`DAO-044` 可观测性](./tasks/DAO-044-可观测性-nestjs-pino.md) | [#52](https://github.com/Fridolph/my-resume-fullstack/issues/52) | 接入 `nestjs-pino` v5 + 统一请求 ID + 脱敏（**审计不做**） | ✅ `done`（**已从本表移出**，见下）|
| [`DAO-045` 审计表](./tasks/DAO-045-审计表.md) | [#53](https://github.com/Fridolph/my-resume-fullstack/issues/53) | 关键操作审计表（删除简历 / 设为默认已接线） | ✅ `done`（账号与权限域另开）|

**为什么拆两卡**：审计涉及 Prisma schema 变更 + 迁移，按 `AGENTS.md` §3.3「一个任务卡只落一条闭环」
不与日志接入混一轮；且"保留多久 / 谁可查 / 删号如何处理"是产品决定，不是工程顺手能定的。

### ✅ DAO-044 已收口（2026-10-16）

接 `nestjs-pino` + 统一请求 ID + 脱敏三件事全部落地，卡里 **8 条验收全部通过**
（隔离 PostgreSQL + 隔离端口，含"真的停库制造 500"与"真实写入含 PII 的简历后 grep 敏感串"）。
`f7ccf23` 已 ff 合入 `dev`。状态、证据与"实测推翻的四处想当然"见[该卡](./tasks/DAO-044-可观测性-nestjs-pino.md)。

> 落地时**偏离了卡里的设计稿一处**，而且更彻底：原方案是「选一条执行顺序并断言」，
> 实际改成**幂等的单一生成处**（两个调用方都调 `ensureTraceId`）—— 顺序不再是契约，也就不必断言。
> 详见卡里「实现中与设计稿不同的三处」。

## Nuxt 配置底座化 —— ✅ 已收口（DAO-042 / #51）

`DAO-042` 于 2026-10-16 收口为 `done`：A（`@rs/config` 共享基线）+ B1（页面私有组件）+ C（构建运行时基线）
已合入 `dev` 并推送（`63a3be2` / `d824907` / `8bb232f` / `98486e5`）。
**按规则已从本表移出** —— 状态、验证证据与收口记录见[该卡](./tasks/DAO-042-Nuxt配置底座化.md)。
唯一未完成项是 Owner 观感验收，写在卡的「确认门与续跑」里，不阻塞 `done`。

## 本轮新立的三张卡（2026-10-16，对应三个 Issue）

| 卡 | Issue | 内容 | 状态 |
| --- | --- | --- | --- |
| [`DAO-039` 测试体系](./tasks/DAO-039-测试体系-vitest.md) | [#48](https://github.com/Fridolph/my-resume-fullstack/issues/48) | 引入 vitest；`resume.service.test.cjs` → `.ts` 且直接 import 源码；**堵住「0 测试也全绿」** | ✅ `done` |
| [`DAO-040` help 与 release-notes 内容](./tasks/DAO-040-help与release-notes内容.md) | [#49](https://github.com/Fridolph/my-resume-fullstack/issues/49) | 两个页面从模板占位改为**与实现一致**的真实内容（未实装的必须标注） | ✅ `done` |
| [`DAO-041` 发版管理](./tasks/DAO-041-发版管理-release-it.md) | [#50](https://github.com/Fridolph/my-resume-fullstack/issues/50) | `release-it` + `@release-it/conventional-changelog` 取代 `standard-version` | ⚠️ `self-tested`（端到端预演待补）|

**共性风险**：前两张卡的验收标准都包含"**不许把未实现写成已实现**" ——
这条不是形式要求：本轮的 release-notes 现状正是模板时代的文案（"no backend yet"），
与真实实现完全脱节，属"文档撒谎"那类问题。

## 集成锚点

| 边界 | 锚点 | 说明 |
| --- | --- | --- |
| `dev → main` | `5e1c43f [☵☳][屯] feat: 在难生中立起简历系统主线，业务成型且共享层归位` | 首次落 main（此前只有 Initial commit）。squash 压平 dev 的 150 笔提交；`main` 与 `dev` 的树哈希逐字节一致（`476237a1`），完整历史保留在 `dev`。本仓作为 Dao Commit 实验仓的第一个真实集成锚点 |

## 待 Owner 处理

- **意图验收（DAO-038 / DAO-037）**：公开页观感（桌面 + 移动端 + 深色）、`/my-resumes` 迁移后的手感、admin 折叠面板与工具栏是否够用。
- **集成锚点**：两次 feature → dev（`22aeb8b`、`da41e78`）仍未定锚（Dao Commit 卦象由人定）。
- **DAO-033 的发现**：历史迁移的 `setval(..., 0)` 早已由 `c43db00` 修复（见 DAO028 复盘 §18.4），此条可直接结掉。

## 已收口（不再需要跟踪）

- **质量门「0 测试也全绿」** —— 已由 `DAO-039` 修掉：三个包的 `test` 脚本都带
  `--passWithNoTests=false`，无匹配测试文件时会失败，不再可能"全绿却什么也没验证"。
- **公开站上线前的两笔（`DAO-038` 遗留）** —— 两笔都已了结，详见该卡「已知缺陷」：
  1. ✅ **不存在的简历返回 200 → 已修**（2026-10-16）。真实根因不是"`setResponseStatus` 不生效"，
     而是页面**同步**读 `emptyReason`，而那一刻 `useAsyncData` 还没解析 ——
     改为 `await resume` 之后再调用。实测 `/resume/999999` 与 `/resume/abc` 均由 200 变 **404**。
  2. ✅ **公开页页头 → 已实现**（`ResumePublicHeader`：品牌 + 身份区）。

> 顺带更正一条流传的判断：**「旧 mock 链已无引用」不成立** —— `useResumeContent` 仍被
> `ResumeDraftWorkspace`、`ResumeSettingsSectionsTab`、`ResumeSectionEditorDrawer` **3 处引用**；
> 确实已无引用的只有 `ResumePageHeader`。清理前要先决定那 3 处的去留，不能按"孤儿"直接删。
