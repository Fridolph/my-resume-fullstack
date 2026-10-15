# 当前关键任务

- [`DAO-034` 简历展示层上提](./tasks/DAO-034-简历展示层上提.md) —— `in-progress`：**批 1 已完成**（展示域类型 / 文档⇄内容映射 / 区块定义 → `@rs/common`）；**批 2 待做**（纯展示组件 → `packages/ui`，卡里记了要先拆的三个坑）。
- [`DAO-035` 共享层治理](./tasks/DAO-035-共享层治理.md) —— `in-progress`：**第一批「清重复」已完成**（`cn` 移到 `ui/app/utils` 走自动导入、`query-keys` 简历域 key 收敛到共享层），并查明一条重要边界：**Vue 的 `defineProps<整个外部类型>()` 无法跟随包的 re-export 链**（只有 dev 的 SFC 编译会报，已用 alias 修）。待做：抽 admin 通用组件、utils 落点、判据入文档。

任务卡仍是状态、目标、验证与交接的唯一事实源；本文件只指向当前任务，不复制目标、状态或证据。

> `done` 的卡（DAO-001~004、006~016、**028**、**029**、**030**、**031**、**032**、**033**）**不再列在本表**，避免指针膨胀；
> 历史、验证证据与收口记录见各自任务卡，集成锚点在卡的「交接」区。

- [`DAO-036` 通用上传端点](./tasks/DAO-036-通用上传端点.md) —— `planned`（等排期）：admin 的 4 个 upload 组件依赖 `POST /api/masterData/file/multipleUpload`，**实测 404**（模板遗留路径），且这些组件**没有任何调用点**。Owner 定：先把上传接口做出来，再按契约把 Upload 组件与业务一并补上（纯函数已收进 `@rs/utils`）。

## 已定的下一轮顺序（Owner 2026-10-14）

| 顺序 | 任务 | 内容 |
| --- | --- | --- |
| ① | **展示层上提** | 把 web 展示域（`ResumePageContainer` + 各 section + 三档风格 + `toResumeContent` / `importResumeDocument`）提到 `packages/ui` + `packages/common`，两端共用 |
| ② | **`/resume/:id` 详情页** | 用上提后的展示层做只读预览；同时补列表的「查看」图标与卡片点击 |
| ③ | Issue #39 自定义模块 | 契约 `custom` 分支 + `view` 枚举 + 编辑 UI + web 展示渲染注册表 |

## 待 Owner 处理的两笔

- **集成锚点**：两次 feature → dev（`22aeb8b`、`da41e78`）都还没定锚（Dao Commit 卦象由人定）
- **DAO-033 的发现**：历史迁移 `20261013120000_internal_int_ids` 的 `setval(..., 0)` 让空库重放失败、
  `migrate dev` 在新环境不可用 —— 建议单独开 Issue
