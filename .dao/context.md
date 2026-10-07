# 项目上下文

> 本文件保留下一位继续工作所需的项目级摘要，不记录完整聊天历史，也不与 `dao/` 任务卡竞争状态主位。

## 当前阶段

- 项目阶段：`首次传承已确认；项目定位已由“全栈模板”转型为 my-resume 的 Nuxt 实现场`
- 当前主线：`以 Nuxt 4 + @pinia/colada + NestJS + PostgreSQL + Redis 逐模块实现 my-resume 的功能与页面，并验证“先熟后生”的双仓学习闭环`
- 当前项目状态：`以 dao/CURRENT.md 为准；本文件不复制任务状态`

## 当前判断

- 已确认事实：`母仓最小锚点已读取并固定到 52cdd3c5386d6b8fa1dbf1a781dd4735c5e40d28；2026-10-07 Owner 确认本仓转型为 my-resume 的 Nuxt 实现场、数据层用 @pinia/colada 替换 alova、第一刀先立基础设施骨架；当前关键任务为 DAO-005。`
- 已知风险或未知：`母仓 main 已推进到 a139058b4397e3f934d320d13d2abac36514d9a1，与 .dao/anchors.md 记录的 52cdd3c 不一致，需一次影响评估；本机未安装 docker，PostgreSQL / Redis 的本地运行方式待定；领域模型保真度、后端 ORM 与 Redis 用途三项选型待 Owner 确认。`
- 项目级下一步：`DAO-005 进行中：admin 与 web 均已接入 @pinia/colada 并落下业务域 layer 骨架；下一步替换 alova 上传链路，随后进入 apps/api 的 Prisma + PostgreSQL + Redis 与 auth 闭环。格式基线问题另立 DAO-006（待 DAO-005 提交后执行）。`

## 运行面边界

- `.dao/`：项目身份、母仓锚点、当前阶段与归母候选。
- `dao/`：关键任务的目标、状态、验证、交接与收口事实源。

## 最近更新

- 日期：`2026-10-07`
- 确认者：`Owner`
- 更新原因：`项目定位转型为 my-resume 的 Nuxt 实现场；DAO-005 三项选型已确认并完成前端数据层与首个业务域骨架`
