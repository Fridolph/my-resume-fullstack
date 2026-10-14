# 当前关键任务

- [`DAO-030` admin 简历创建页](./tasks/DAO-030-admin%20简历创建页.md) —— `review-ready`：`/resume` **概览页**（卡片 / 列表两档 + 本地记忆 + 新建入口）与 **`GET /api/resume` 列表接口**、`/resume/new` 七区块大表单（稀疏提交 + 契约自检 + 上传占位）、页头搜索改按页面配置；Owner 观感确认，已推送 `feat/38-admin-resume-create`（`1ea4843`），等 feature → dev。范围已调整：**列表归本卡**，DAO-029 只剩重命名 / 软删除。
- [`DAO-031` admin 真实登录与会话](./tasks/DAO-031-admin%20真实登录与会话.md) —— `review-ready`（DAO-030 的前置）：真实登录 `/auth/login` + `/auth/info` 恢复身份与权限键 + `auth` / `guest` 中间件 + 登录页与用户区。同分支 `feat/38-admin-resume-create`（`7bae6c5`）。

任务卡仍是状态、目标、验证与交接的唯一事实源；本文件只指向当前任务，不复制目标、状态或证据。

> `done` 的卡（DAO-001~004、006~016、**028**）**不再列在本表**，避免指针膨胀；
> 历史、验证证据与收口记录见各自任务卡，集成锚点在卡的「交接」区。
