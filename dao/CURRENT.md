# 当前关键任务

- [`DAO-032` 简历列表管理与编辑页](./tasks/DAO-032-简历列表管理与编辑页.md) —— **`in-progress`（当前）**：列表改 **UTable** + 行内「编辑 / 删除」、后端 `PATCH /resume/:id`（重命名）与 `DELETE /resume/:id`（软删除）、编辑页 `/resume/:id/edit`（就地编辑文档、保真合并、409 冲突提示）、共享表单增强（`textItems` 字段类型 + 只读插槽）。机器验证 9/9 + 7/7 + 8/8 通过，**等 Owner 观感验收**。查看详情预览与自定义模块分别留给「展示层上提」与 Issue #39。
- [`DAO-029` 简历 CRUD](./tasks/DAO-029-简历%20CRUD.md) —— `review-ready`：重命名 / 软删除已随 DAO-032 落地（列表已提前给 DAO-030），整卡范围完成。
- [`DAO-030` admin 简历创建页](./tasks/DAO-030-admin%20简历创建页.md) —— `review-ready`：`/resume` 概览页 + `GET /api/resume` 列表接口 + `/resume/new` 七区块大表单 + 页头搜索按页面配置。已推送 `1ea4843`。
- [`DAO-031` admin 真实登录与会话](./tasks/DAO-031-admin%20真实登录与会话.md) —— `review-ready`（DAO-030 的前置）：真实登录 + 身份恢复 + `auth` / `guest` 中间件 + 登录页与用户区。已推送 `7bae6c5`。

> 上面四张卡都在同一分支 `feat/38-admin-resume-create`，等 **feature → dev** 时一并集成（DAO-029/030/031 待 Owner 看完 DAO-032 的验收项一起确认）。


任务卡仍是状态、目标、验证与交接的唯一事实源；本文件只指向当前任务，不复制目标、状态或证据。

> `done` 的卡（DAO-001~004、006~016、**028**）**不再列在本表**，避免指针膨胀；
> 历史、验证证据与收口记录见各自任务卡，集成锚点在卡的「交接」区。
