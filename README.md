# Dao Fullstack Template

可复用的 `pnpm + Turborepo` 全栈模板，面向同时包含用户端、管理端与 API 的 `dao-*` 项目。它内置代码质量、版本与 Changelog 基础设施，并以 `Dao-is-Coding` 作为协作与持续演进的上位范式。

这个仓是项目验证场，不是 `Dao-is-Coding` 母仓：项目在真实约束下生长；跨项目验证过的规则、流程和经验再回灌母仓。反过来，母仓已验证的规范和 skills 可经评估后同步到项目。

- `apps/web`：Nuxt 4 + Nuxt UI + Tailwind CSS 4
- `apps/admin`：Nuxt 4 + Nuxt UI + Tailwind CSS 4
- `apps/api`：NestJS API，提供 `/api/health` 心跳接口
- `packages/common`：统一响应结构与错误结构（纯 TS，需构建）
- `packages/ui`：跨 web / admin 共享的 UI 组件（Nuxt layer，零构建、自动导入；见 [packages/ui/README.md](./packages/ui/README.md)）
- 根目录：Oxlint、Oxfmt、Standard Version 与协作规范

## 当前用途：my-resume 的 Nuxt 实现场

本仓的底座是 `dao-monorepo-temp` 模板；当前用途是**先用熟悉的技术栈把 `my-resume` 的功能与页面逐模块实现出来**（Nuxt 4 + Nuxt UI + layers + `@pinia/colada`，NestJS + PostgreSQL + Redis）。验证过的结论再带回 `my-resume` 仓，用 React + Next.js + Python 重做同一套功能，形成“先熟后生”的学习闭环。

- 推进方式：一个关键任务一张 `dao/tasks/DAO-*.md` 任务卡，只落一个模块或一条闭环；当前任务见 [`dao/CURRENT.md`](./dao/CURRENT.md)，任务边界见 [AGENTS.md](./AGENTS.md)。
- 底座与业务分层：底座能力（工程骨架、公共组件、校验与工具）保持通用可抽离；`my-resume` 的业务实现放在应用自身的业务域 layer 与后端模块内。
- 外部蓝图：`my-resume/docs/rs/` 的三份文档（三端职责、数据模型与 PostgreSQL 选型、AI 能力与迁移清理）。

## 工程约定

- 使用 pnpm workspace 与 Turborepo 管理多应用和共享包。
- 保持模板通用性：业务代码放在应用内；跨应用且稳定的**纯 TS**能力进 `packages/common`，跨应用的**UI 组件**进 `packages/ui`（layer 形式，见 [docs/web/03_Layers_分层约定.md](./docs/web/03_Layers_分层约定.md) §7）。
- 前端默认使用 Nuxt 4、Nuxt UI、Tailwind CSS 4 与 TypeScript；API 默认使用 NestJS、严格类型、统一响应和异常结构。
- 改动前先明确目标、非目标、风险、涉及文件和验收标准；发现旁支问题应拆成独立 Issue。
- 环境变量、密钥、数据库连接等敏感配置只放在后端 `.env`，不得提交或暴露给前端；用 `.env.example` 提供脱敏说明。
- 模板默认在 `main` 小步推进；当并行协作、发布约束或主干稳定性需要更重承载时，再显式选择分支工作流。
- 完整协作流程、测试要求、skills 与归母规则见 [AGENTS.md](./AGENTS.md)。
- 前端（Nuxt 4 / Nuxt UI）的命名规则、高频踩坑与 admin 布局模板见 [docs/dev](./docs/README.md)。

## Dao-is-Coding 开发流程

本模板采用轻量的“判断 → 流转 → 收口 → 沉淀”闭环，而不是额外叠加一套管理工具：

```text
任务澄清
-> planned -> designed -> in-progress -> self-tested -> review-ready -> done
                         \-> blocked
-> 按需沉淀 / 归母
```

- `planned`：目标明确，尚未形成可开发设计。
- `designed`：目标、边界、依赖、验证入口和涉及文件已足以开始。
- `self-tested`：本地验证完成；`review-ready` 还要求交接包齐全，直接在 `main` 开发时无需强制 PR。
- `blocked`：记录卡点和解除卡点的第一步，避免假推进。

每一门都先看意图、边界、承载、风险和验证入口；未成熟，不越位。任务切换时留下最小交接包：`目标 / 状态 / 已完成 / 下一步 / 阻塞 / 自测 / 文档锚点 / 集成锚点（如适用）`。

推荐的最小节奏：

1. 开工前写清目标、非目标、风险、文件和验收；不清楚时使用 `dao-grill`。
2. 实现后完成受影响范围的自动化与人工验证。
3. 收口前按目标、范围、验证、风险、文档同步做自审；需要时使用 `dao-review`。
4. 日常开发与单任务收口使用 Conventional Commit；只有多个普通提交在 `feature -> dev` 或 `dev -> main` 合并 / squash 后，才按净变化使用 Dao Commit 留高信号锚点。
5. 出现可复用经验时，先判断留在项目、候选观察或回灌母仓。

### 最小任务运行面

对存在协作切换、风险、跨文件影响或阶段性价值的关键任务，本模板用 `dao/` 作为最小运行面：

```text
dao/CURRENT.md -> 当前唯一关键任务
dao/tasks/DAO-XXX-*.md -> 目标、状态、验证、交接与收口的唯一事实源
dao/experiments/ -> 尚未验证的 Harness 假设
```

它不替代 Issue、PR、CI 或聊天记录，也不保存完整过程日志。它只保留改变下一步判断的事实，避免换窗口或换 Agent 后重新从猜测开始。当前样例与使用边界见 [`dao/README.md`](./dao/README.md)。

## Skills 与 Dao 接入

本模板不把 skills 打包为项目依赖。它们由个人 Codex 环境统一提供，项目只声明何时应使用。

| 类别       | 当前可用能力                                                                                          | 使用方式                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Dao 流程   | `dao-intro`、`dao-grill`、`dao-handoff`、`dao-review`、`dao-commit`、`dao-return-dao`、`dao-role-map` | 已由 `Dao-is-Coding` 母仓维护并在当前环境可用；按触发条件使用，不机械全跑 |
| Nuxt / Vue | `nuxt`、`nuxt-ui`、`vue-best-practices`、Vue 路由与状态管理 skills                                    | 前端任务按框架约定执行                                                    |
| 验证与质量 | `webapp-testing`、`playwright-*`、`frontend-code-review`、TypeScript skills                           | UI、端到端测试、代码审查或类型问题按需使用                                |
| 体验与交付 | 可访问性、性能、设计、部署相关 skills                                                                 | 仅在相应任务和授权范围内使用                                              |

当前 Dao skill 的规范源在 `Dao-is-Coding/60-器-技能与构建/00-技能/`。本机已有六项流程 skill 直接链接到该源；`dao-commit` 可用但为独立副本，当前与母仓源存在版本差异，更新前应先确认权威版本。若新电脑或新环境缺少它们，应从该规范源统一安装/链接后再使用；不要复制进某个子项目。需要额外能力时，先用 `find-skills` 查询候选，确认后再安装。

### 新仓首次传承

从 GitHub Template 创建新仓后，根目录会携带 `.dao-seed/`。它是可复制的传承种子，不是模板仓的任务历史或实验结论。

首次让新 AI 伙伴进入时，先运行 `dao-intro`：读取项目规则、传承种子与可访问的母仓锚点，复述对 Dao、项目身份与协作边界的理解，并只补充最多三个真正影响项目传承的问题。AI 必须先预览拟生成的 `.dao/` 四份文件，等待 Owner 明确确认后才可写入。

```text
.dao-seed/  可复制的传承种子
.dao/       经确认后生成的项目传承包
dao/        关键任务的运行面与唯一事实源
```

`.dao/` 管项目身份、母仓锚点、项目阶段和归母候选；`dao/` 管具体任务的目标、状态、验证与交接。项目经验先留在本仓，成熟后再用 `dao-return-dao` 提出归母建议。

## 母仓—子仓双向回路

```text
Dao-is-Coding 母仓
  定义跨项目的判断、流程、skills 与知识结构
          ↓ 经项目评估后采用
dao-* 子项目
  在真实业务、工程约束与验证中实践
          ↓ 经证据与成熟度判断后回灌
Dao-is-Coding 母仓
```

### 子仓回灌

当项目出现可跨项目复用的规则、流程、命名、坑点或对旧定义的修订依据时，使用 `dao-return-dao` 先判断成熟度。候选至少应说明：触发事件、涉及层级、可复用性、证据/反例、建议落点和下一步。

业务规则、一次性实现细节、未经验证的灵感和强依赖本仓上下文的记录，默认留在项目中，不直接回灌。

### 母仓同步

母仓更新不自动覆盖项目。接收一项更新时，先确认其目的和影响，再选择性更新本机 Dao skill 或项目文档，并记录采用的母仓版本/提交及本仓影响。这样既能随时吸收成熟经验，也不会让模板或业务在不知情下漂移。

## 开始使用

```bash
pnpm install
pnpm run dev
```

### Admin 脚手架

`apps/admin` 已提供可复用的后台起始模板，命名与布局规范见 [docs/dev](./docs/README.md)：

- `/login` 使用 `AuthSplitLayout` 与 `AuthLoginForm`（组件 `LoginForm.vue`），左右图片分栏，通过 `image-side`、`imageSrc` 等 props 配置视觉区域。
- 受保护业务页面使用 `has-sidebar` 布局：`AdminSidebar` 支持折叠和一级/二级导航，`AdminHeader` 提供 sticky header，侧栏底部 `AdminUserMenu` 提供用户下拉菜单。
- 导航、品牌和外链集中在 `config/admin-navigation.ts`，Settings 二级导航在 `config/settings-navigation.ts`；登录提交目前为 mock 交互，不接真实认证 API。

## 默认端口

| 服务  | 默认端口 | 地址                               |
| ----- | -------- | ---------------------------------- |
| Web   | `4041`   | <http://localhost:4041>            |
| Admin | `4047`   | <http://localhost:4047>            |
| API   | `4049`   | <http://localhost:4049/api/health> |

三个端口避开了常见项目的默认端口，也避开了浏览器限制的 `4045`。可通过以下环境变量覆盖默认值：

```bash
# apps/web 或 apps/admin
NUXT_PUBLIC_API_BASE=http://localhost:4049/api

# apps/api
PORT=4049
```

如需覆盖 Nuxt 开发服务器端口，可修改相应应用的 `dev` script，或在启动命令中传入 `--port`。

## 常用脚本

```bash
# 首次：起本地 PostgreSQL（Docker；数据存在 named volume 里）
docker compose up -d

pnpm dev             # 启动 web、admin、api 三端
pnpm build           # 构建所有 workspace package
pnpm build:fresh     # 忽略 Turbo 缓存后重新构建
pnpm clean           # 清除本地构建产物与 Turbo 缓存
pnpm typecheck       # 运行全部类型检查
pnpm lint            # 使用 Oxlint 进行静态检查
pnpm format          # 使用 Oxfmt 格式化代码和文档
pnpm format:check    # 检查格式，不写入文件
pnpm test            # 运行各 package 的测试
```

推荐在提交前执行：

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## 提交与 Changelog

日常提交采用 Conventional Commits：

```text
feat(web): add user profile page
fix(api): return validation errors consistently
docs: document local development workflow
```

`standard-version` 根据这些提交生成 `CHANGELOG.md`、更新根 `package.json` 的版本号，并创建对应的 Git commit 与 tag；它不会发布 npm 包。

发布前请确保处于稳定发布分支、工作区干净，并完成质量检查。先预览变更：

```bash
pnpm exec standard-version --dry-run
```

确认后选择一个版本级别：

```bash
pnpm release:patch   # 修复版本，例如 0.1.0 → 0.1.1
pnpm release:minor   # 向后兼容的新功能，例如 0.1.0 → 0.2.0
pnpm release:major   # 破坏性变更，例如 0.x → 1.0.0
```

首次建立版本记录可使用 `pnpm release:first`。只需基于现有提交重建 Changelog 而不修改版本、提交或 tag 时，使用 `pnpm changelog`。执行发布脚本后，复核生成的 `CHANGELOG.md`、版本提交和 tag，再推送：

```bash
git push --follow-tags
```
