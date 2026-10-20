# my-resume-fullstack

**`Dao-is-Coding` 的进行时验证仓**：用熟悉的全栈技术栈真实实现 `my-resume`，在业务约束下跑通「先熟后生」的双仓学习闭环。

这个仓**不是** `Dao-is-Coding` 母仓，也**不只是**一个可复用的全栈模板 —— 它是母仓范式在真实业务里的验证场：简历系统（个人能力、风格、编辑、版本发布）、用户与权限、账号与会话都在这里逐模块实装，而不停在范例层面。跨项目验证过的规则、流程和经验再回灌母仓；反过来，母仓已验证的规范和 skills 可经评估后同步到项目。

底座仍沿用 `dao-monorepo-temp` 模板（`pnpm + Turborepo` + Nuxt 4 + NestJS），但底座能力保持**通用可抽离**，业务实现留在应用自身的业务域 layer 与后端模块内 —— 见 [AGENTS.md](./AGENTS.md) §1。

- `apps/web`：Nuxt 4 + Nuxt UI + Tailwind CSS 4
- `apps/admin`：Nuxt 4 + Nuxt UI + Tailwind CSS 4
- `apps/server`：NestJS API，提供 `/api/health` 心跳接口
- `packages/common`：统一响应结构与错误结构（纯 TS，需构建）
- `packages/config`：`apps/web` 与 `apps/admin` 共用的 **Nuxt 构建基线**（`@rs/config`，纯函数配置工厂、零构建）
- `packages/ui`：跨 web / admin 共享的 UI 组件（Nuxt layer，零构建、自动导入；见 [packages/ui/README.md](./packages/ui/README.md)）
- 根目录：Oxlint、Oxfmt、Standard Version 与协作规范

后端目录为 `apps/server`，工作区包名为 `@rs/server`：`pnpm --filter @rs/server dev` 按包名选择项目，也可用 `pnpm --filter ./apps/server dev` 按路径选择。目录从 `apps/api` 重命名而来，现有源码、本地配置和数据库迁移文件一起保留；HTTP 前缀仍为 `/api`。若需回滚，同步恢复目录、包名、锁文件 importer 和文档命令即可，不涉及数据库回滚。

## 个人能力与本人草稿（DAO-028）

从需求到交付的逐步指导与真实学习过程见 [DAO-028 学习复盘](./docs/dev/05_全栈简历项目_DAO028学习复盘.md)，可作为后续博客系列的参考；业务事实与候选功能分别标明。

作者入口 `/resume/draft` 使用真实登录；仅管理员角色且拥有 `Resume.Sections:edit` 可编辑本人草稿。公共演示 `/resume` 保留原展示。能力分组、条目、佐证、自评维度可配置，支持排序、文字/条状图/雷达图；评分默认未填写。完整文档通过三条 `/api/resume` 接口读写，2.5 秒自动保存和 revision 条件更新防止窗口间覆盖。

新增目录：`packages/common/src/resume` 承载稳定文档契约和 Zod 校验，`apps/server/src/resume` 承载所有权与持久化；web 的 `capabilities`、`draft` 组件仍位于已有业务 layer。common 复用后端同版本 Zod，前端不依赖 Prisma。回滚前先备份草稿；撤销业务代码后，现有用户与权限表无须更改，新三表的逆迁移必须单独确认。完整设计、验收与限制见 [个人能力专题](./docs/dev/04_简历系统_个人能力字段与内容结构.md)。

临时 PostgreSQL 自动验证入口（需要本机 `initdb`、`pg_ctl`、`curl`、Bash）：

```bash
bash apps/server/scripts/test-resume-isolated.sh
```

脚本使用 127.0.0.1:55433 独立数据库、4059 独立 API，执行迁移与真实 HTTP 异常/并发验证，退出时停止并清理实例，不读取项目数据库连接。端口被占用时停止，不连接已有实例。Windows 可在具备 PostgreSQL 工具的 Bash/WSL 中运行。OpenAPI 维护入口 `pnpm --filter @rs/server docs:resume` 输出文档至标准输出；更新文件需审查 diff。

## 项目主线与推进方式

主线是**先用熟悉的技术栈把 `my-resume` 的功能与页面逐模块实现出来**（Nuxt 4 + Nuxt UI + layers + `@pinia/colada`，NestJS + Prisma + PostgreSQL + Redis），再把验证过的结论带回 `my-resume` 仓，用 React + Next.js + Python 重做同一套功能，形成“先熟后生”的学习闭环。

- 推进方式：一个关键任务一张 `dao/tasks/DAO-*.md` 任务卡，只落一个模块或一条闭环；当前任务见 [`dao/CURRENT.md`](./dao/CURRENT.md)，任务边界见 [AGENTS.md](./AGENTS.md)。
- 底座与业务分层：底座能力（工程骨架、公共组件、校验与工具）保持通用可抽离；`my-resume` 的业务实现放在应用自身的业务域 layer 与后端模块内。
- 外部蓝图：`my-resume/docs/rs/` 的三份文档（三端职责、数据模型与 PostgreSQL 选型、AI 能力与迁移清理）。
- 简历业务总设计：[简历系统核心设计](./docs/dev/03_简历系统_核心设计.md) 记录多份简历、模块编排、个人能力、编辑入口、版本发布与分享；后续专题从该入口展开，已采用方向与待确认项分别标注，当前不代表表结构或功能已实装。
- 简历模块按 [AGENTS.md §3.3](./AGENTS.md#33-单-task-全栈闭环开发模式) 逐 Task 完成设计、后端、前端、联调、验证和交付；首个专题为 [个人能力字段与内容结构](./docs/dev/04_简历系统_个人能力字段与内容结构.md)。

### 用户创建接口

`apps/server/src/user` 按 `dto/`、controller、service、module 平级组织，已实现 `POST /api/user` 与 `PATCH /api/user/:id`。超级管理员可创建 `admin/user`；资料修改只允许 nickname/avatar，普通用户和管理员只能修改本人，超管可修改他人。其他 CRUD 保留学习模板。认证已使用数据库账号，新账号可调用现有登录接口。Repository 仅在查询复杂或需要复用时引入。

本轮新增用户资料可空列及 `super_admin` 角色预设，提供迁移和 seed 源码，未执行数据库操作或验证。运行前由 Owner 完成迁移、Prisma Client 生成与角色初始化；请求示例、步骤和学习说明见 [用户模块业务讨论](./docs/server/02_用户模块_业务讨论模板.md)。

当前支持 username 或 email 登录、nickname 昵称、cuid 身份；创建用户时 username/email 至少填写一个。当前请求、seed 与 Apifox 操作以 [超管创号与邮箱登录](./docs/server/04_账号创建与登录_业务讨论.md) 为准，旧讨论记录仅供学习回顾。公开注册尚未开放。

资料修改与软删除已实装，等待 Owner 人工验证；密码和查询接口后续逐方法推进。已确认的权限边界、伪代码与 Apifox 清单见 [用户修改与删除业务讨论](./docs/server/05_用户修改与删除_业务讨论.md)。

鉴权采用 Nest Passport 集成：`@nestjs/jwt` 签发令牌，`passport-jwt` 提取 Bearer token、验签与检查过期，JwtStrategy 查询当前数据库身份；全局 Guard 保留 `@Public()` 和统一错误码。每次请求恢复当前角色权限，不启用服务器 session。

## 工程约定

- 使用 pnpm workspace 与 Turborepo 管理多应用和共享包。
- 保持**底座与业务分层**：业务代码放在应用内；跨应用且稳定的**纯 TS**能力进 `packages/common`，跨应用的**UI 组件**进 `packages/ui`（layer 形式，见 [docs/web/03_Layers_分层约定.md](./docs/web/03_Layers_分层约定.md) §7）。
- 前端默认使用 Nuxt 4、Nuxt UI、Tailwind CSS 4 与 TypeScript；API 默认使用 NestJS、严格类型、统一响应和异常结构。
- 改动前先明确目标、非目标、风险、涉及文件和验收标准；发现旁支问题应拆成独立 Issue。
- 环境变量、密钥、数据库连接等敏感配置只放在后端 `.env`，不得提交或暴露给前端；用 `.env.example` 提供脱敏说明。
- **分支模型**：`main` 只承载发布与正式版本，**不直接在 `main` 上开发**；日常开发在 `dev`，并从 `dev` 开 `feat/<issue>-<slug>` / `fix/…` / `docs/…` / `chore/…` 短分支，验证完成后合回 `dev`。
  **推送分界**：`dev` 与从 `dev` 检出的开发分支由 **AI 自行判断并推送**；`main`（含 `dev → main`）与发版归 Owner —— 闸门设在 `main` / 发版，不设在"推送"这个动作上（见 [AGENTS.md](./AGENTS.md) §4）。
  完整流程见 [docs/dev/01_开发流程_分支与提交.md](./docs/dev/01_开发流程_分支与提交.md)。
- 完整协作流程、测试要求、skills 与归母规则见 [AGENTS.md](./AGENTS.md)。
- 前端（Nuxt 4 / Nuxt UI）的命名规则、高频踩坑与 admin 布局模板见 [docs/dev](./docs/README.md)。

## Dao-is-Coding 开发流程

本项目采用轻量的“判断 → 流转 → 收口 → 沉淀”闭环，而不是额外叠加一套管理工具：

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

对存在协作切换、风险、跨文件影响或阶段性价值的关键任务，本项目用 `dao/` 作为最小运行面：

```text
dao/CURRENT.md -> 当前唯一关键任务
dao/tasks/DAO-XXX-*.md -> 目标、状态、验证、交接与收口的唯一事实源
dao/experiments/ -> 尚未验证的 Harness 假设
```

它不替代 Issue、PR、CI 或聊天记录，也不保存完整过程日志。它只保留改变下一步判断的事实，避免换窗口或换 Agent 后重新从猜测开始。当前样例与使用边界见 [`dao/README.md`](./dao/README.md)。

## Skills 与 Dao 接入

本项目不把 skills 打包为项目依赖。它们由个人 Codex 环境统一提供，项目只声明何时应使用。

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

母仓更新不自动覆盖项目。接收一项更新时，先确认其目的和影响，再选择性更新本机 Dao skill 或项目文档，并记录采用的母仓版本/提交及本仓影响。这样既能随时吸收成熟经验，也不会让底座或业务在不知情下漂移。

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

# apps/server
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

`release-it` + `@release-it/conventional-changelog` 根据这些提交生成 `CHANGELOG.md`、更新根 `package.json`
的版本号，并创建对应的 Git commit 与 tag。**它不会推送、也不会发布 npm**（`.release-it.json` 里显式关掉了）——
发布产物的推送是单独一步，且归 Owner。

> **推送的分界**（[AGENTS.md](./AGENTS.md) §4）：`dev` 与从 `dev` 检出的开发分支由 **AI 自行判断并推送**；
> **`main`（含 `dev → main`）与发版（tag / release）归 Owner**。闸门设在 `main` / 发版，
> 不设在"推送"这个动作上 —— `dev` 是**开发流程记录**，只有 `main` / tag 才代表"已发布"。

发版还会**一并更新 release notes 页面**：`after:bump` 钩子跑 `scripts/sync-release-notes.mjs`，
把 `CHANGELOG.md` 同步进 `packages/common/src/ui/release-notes.ts`（admin 的 `release-notes.vue` 读它）。

发布前请确保**在 `main` 分支、工作区干净**（两道闸都会拦），并完成 `pnpm check`。先预览：

```bash
pnpm release:dry
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

## 简历 PDF 预览与下载

web `/resume/:id/pdf` 读取已发布内容（须登录），admin 同路径读取本人草稿。两端使用
`@rs/ui/pdf` 的同一份安全 HTML/CSS 和自动 A4 分页，后端 Chromium 直接响应文件。
首次运行导出前安装与 Playwright 匹配的浏览器（不涉及数据库）：

```bash
pnpm --filter @rs/server exec playwright install chromium
pnpm --filter @rs/server test:resume:pdf
pnpm --filter @rs/server build
pnpm --filter @rs/server test:resume:pdf:http
```

后两项为真实浏览器/HTTP 隔离验收；HTTP 测试使用固定身份和仓储替身，不连接项目数据库。
服务器需要 Chromium 的系统依赖与中文字体；本轮未修改部署配置。方案、资源策略和验收记录见
[导出与打印](./docs/dev/06_简历系统_导出与打印.md#11-2026-10-19双端分页预览与直接下载续作方案)。

### PDF 配置与个人公共预设

双端 PDF 页的「PDF 配置」支持模块/字段显隐、四边距、字号行高、主题色、页眉页脚与 slogan。
每份简历保存于 `document.display.pdf`，本人公共预设保存于 `resume_workspaces.pdf_config`；应用预设为复制，不联动其他简历。
admin `/settings/print-config` 集中管理本人公共预设，设置导航支持桌面与手机。新建简历优先保留明确传入的PDF配置（如复制），否则继承本人预设，没有预设时保存系统默认快照；修改预设不追改旧简历。
设置页业务组件位于 `13-settings/app/components/print-config`，沿用现有接口及共享表单，无新增数据库结构；撤销本轮页面与创建逻辑可回滚。
先按已确认环境执行新增迁移 `20261019110000_resume_pdf_config`，再 generate/build；不需要 seed 或新增环境变量。
旧文档缺少 `pdf` 时使用系统默认，公共预设未保存时返回 null。

```bash
pnpm --filter @rs/server test:resume:pdf:config
pnpm --filter @rs/server test:resume:pdf:config:isolated
```

后一个命令仅写临时 PostgreSQL（55439）及测试服务（4159），退出后清理；不访问现有数据库。
接口、交互与回滚见 [PDF 配置设计](./docs/dev/07_简历系统_PDF配置.md)。

PDF 预览配置采用“即时预览、显式保存”：当前简历配置与公共预设独立读取；公共预设维护入口是 admin `/settings/print-config`。共享 UI 的左右 Drawer/Slideover 使用 600px 最小阅读宽度 token，并在手机上约束到视口；空布局 Header 可使用 `MyBackButton`。详见 `packages/ui/README.md`。
