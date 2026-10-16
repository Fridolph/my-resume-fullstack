# 【DAO-031】admin 真实登录与会话（DAO-030 的前置）

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done` —— 真实登录与会话落地，Owner 观感确认（2026-10-14 随 [22aeb8b] merge 合入 `dev`）
- Owner：`昇哥`
- 创建日期：`2026-10-14`
- 分支：与 DAO-030 同分支 `feat/38-admin-resume-create`（Owner 选择本期一起交付，已推送）
- Issue：[#40](https://github.com/Fridolph/my-resume-fullstack/issues/40)（2026-10-14 建立）
- 关联：`DAO-030`（本卡是它的前置）、[`docs/dev/02_身份与权限_设计.md`](../../docs/dev/02_身份与权限_设计.md)、web 侧参照实现 `apps/web/app/{apis/auth.ts,composables/useAuthState.ts}`、后端 `apps/server/src/auth/`

## 为什么会有这张卡

DAO-030 的验收要求「`/resume/new` 提交成功后能在 web 端看到这份简历」，而提交走 `POST /api/resume`（全局 JWT Guard + `AuthUser`）。但 admin 现状是：

| 项 | 现状 |
| --- | --- |
| `/login` | **demo**：`setTimeout(600)` + toast，不调接口（`apps/admin/app/pages/login.vue`） |
| token | 没有任何地方写 `my-resume.token` cookie（`TOKEN_COOKIE_KEY` 只被 web 的 `useAuthState` 写入） |
| 权限数据 | `usePermission().permissionKeys` 恒为空；`middleware/permission.ts` 因此走「过渡策略：没有权限数据就放行」 |
| 用户区 | `AdminUserMenu.vue` 用写死的 mock 用户 |

结论：**admin 在接入真实登录前，创建页的提交链路必然 401**（请求层会清 token 并跳 `/login`）。Owner 选择本期把登录一并接上，让 DAO-030 能端到端验收。

## 目标与边界

- 目标：admin 能用真实账号登录（`POST /api/auth/login`）→ token 落 cookie → 刷新后用 `GET /api/auth/info` 恢复身份与权限键 → 未登录访问受保护页跳 `/login` → 退出清 token。
- 非目标：
  - 不做注册 / 改密 / 会话强制下线（属 Issue #30 / #31）。
  - **不改 web 侧 `useAuthState`**（已随 DAO-028 验收，改它有回归风险）。
  - **不改 `middleware/permission.ts` 的「空即拦」过渡策略** —— 一旦改成"空即拦"，admin 全站（含 `/comps/*` 演示页）都要登录，那是**全站策略决定**，不属本卡。
- 涉及文件 / 模块：
  - `apps/admin/app/types/auth.ts`（新增，对齐后端 identity）
  - `apps/admin/app/apis/auth.ts`（新增：login / identity）
  - `apps/admin/app/composables/useAuthState.ts`（新增：admin 侧最小实现）
  - `apps/admin/app/plugins/auth.ts`（新增：客户端启动时 hydrate）
  - `apps/admin/app/middleware/auth.ts`（新增：按页面声明保护）
  - `apps/admin/app/pages/login.vue`（改为真实登录）
  - `apps/admin/app/components/admin/AdminUserMenu.vue`（改为真实用户 + 退出）
- 风险与未知：
  - 登录接口的字段是 `account`（用户名**或**邮箱），而 admin 的登录表单字段是 `email` —— 需要把 label/占位改成「用户名或邮箱」并映射到 `account`。
  - SSR 阶段没有 cookie 时不应阻塞渲染：hydrate 只做「有 token 才拉身份」。
  - `permissionKeys` 写入 `usePermission` 后，DAO-030 页面才能用 `hasPermission('Resume.Sections:edit')` 判断编辑资格。
- 验收：
  - 用真实账号（本地 super 账号）登录成功，跳回后台；刷新后身份与权限键仍在（`/auth/info` 恢复）。
  - 退出后 token 清除，受保护页跳 `/login`。
  - 未登录直接访问 `/resume/new` → 跳 `/login`。
  - `format:check` / `lint` / `typecheck` / `build` 通过。

## 设计与决策

| 决策 | 理由 / 证据 | 确认者 | 日期 |
| --- | --- | --- | --- |
| **admin 自写最小 `useAuthState`，不共用 web 的实现** | web 版面向旧 `osw*` 形状（`permissionList` / `oswUserInfo`）且已验收；上提会同时改动 web 登录链路，风险与本卡收益不匹配。统一留给后续卡 | Owner 确认（一并做，按最小范围） | 2026-10-14 |
| **受保护页面用新增 `auth` 中间件按页声明，不动 `permission` 的过渡策略** | 「空即拦」是全站策略决定；本卡只需要保护 resume 域 | 归枢记录 | 2026-10-14 |
| 会话形状对齐后端 `/auth/info`（`BackendIdentity`） | 后端返回 `{ userId, email, nickname, roleKeys, permissionKeys }`，直接用作会话数据，不做旧形状映射 | 归枢记录 | 2026-10-14 |

## 确认门与续跑

- 当前确认门：`已确认，可开工`
- 确认后第一刀：`apps/admin/app/apis/auth.ts` + `types/auth.ts` + `composables/useAuthState.ts` → login 页接真实登录 → `auth` 中间件
- 之后：回到 DAO-030 的父页 / 侧栏 / 创建页

## 执行与验证

| 类型   | 命令 / 样本 / 链接 | 结果 | 仍未验证的边界 |
| ------ | ------------------ | ---- | -------------- |
| 机器验 | `pnpm format:check` / `lint` / `typecheck` / `test` / `build` | 通过（typecheck 6/6） | — |
| 结构验 | 未登录 `curl -s -o /dev/null -w '%{http_code}' localhost:4047/resume/new` | **302 → /login**（SSR 阶段就拦下，无闪烁） | — |
| 结构验 | 带 `my-resume.token` cookie 请求 `/resume`、`/resume/new` | **200**，SSR HTML 含真实昵称「超管」、7 个区块标题、侧栏项；**不再出现 mock 用户 `Admin User`** | — |
| 结构验 | `POST /api/auth/login` + `GET /api/auth/info` | 返回 `super_admin` + 11 个权限键（含 `Resume.Sections:edit`） | — |
| 意图验 | 浏览器实点登录表单 / 侧栏用户区退出 | **未执行** —— 本机沙箱下 Chromium 无法启动（写 profile 路径被拒），自动化浏览器验证做不了 | **登录表单的真实点击登录、退出登录的交互效果需 Owner 实看** |

## 交接

- 已完成：admin 真实登录链路（types / apis / `useAuthState` / plugin / `auth` + `guest` 中间件 / login 页接真实接口 / 用户区显示真实身份并可退出）
- 当前状态：`in-progress`（代码与机器验证完成，等 Owner 的观感验收）
- 阻塞：无
- 下一步第一刀：Owner 验收（登录 → 刷新保持 → 退出 → 未登录直开受保护页）
- 文档锚点：`docs/dev/02_身份与权限_设计.md`
- 集成锚点：`待 feature -> dev`（与 DAO-030 同分支合并）
- 明确未做（写在卡里，避免下次误以为漏了）：**没有**改 `middleware/permission.ts` 的「空即拦」过渡策略；**没有**统一两端 auth 会话形状；**没有**做改密 / 会话强制下线（属 Issue #30/#31）

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：待补
- Git / PR：待补
- 常规提交：待补
- Dao Commit：`不适用`（尚未到集成边界）
- 沉淀候选：`无`
- 收口备注：
