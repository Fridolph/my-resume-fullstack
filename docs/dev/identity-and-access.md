# 身份与权限设计（permissionKeys / Header 分档 / AI 试用）

> 状态：**设计已确认（2026-10-09）**，按 P0 实施中。
> 2026-10-09 追加确认：① 透传用 **composable 单例 + plugin**（不做 Provider 组件树）；② 登录态改 **cookie**；③ 权限键定稿：**成对的 `view` / `edit`，共 14 个**（Owner 把"看得到"与"改得动"拆成两档）。
> 关联：`resume-display-architecture.md` §6.1（既有的 rail 方案）、`docs/dev/css-conventions.md`、`docs/dev/layers.md` §7、
> 现有实现：`apps/admin/app/composables/usePermission.ts`、`apps/admin/app/components/permission/PermissionWrapper.vue`、
> `apps/web/layers/11-public-resume/app/composables/useResumeAdmin.ts`

## 1. 要解决的问题

| #   | 现象                    | 根因                                                                                                                                                                    |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 简历页头部右侧「乱」    | `pages/resume/index.vue` 把**四类不同性质**的东西平铺进 `#actions`：状态回显（保存中/已保存）、危险操作（重置）、身份入口（登录）、常规操作（展示设置），且同一视觉权重 |
| 2   | 三级身份表达不出来      | web 只有 `useResumeAdmin().isAdmin` 一个布尔；admin 有 `permissionKeys` 体系但两端不通                                                                                  |
| 3   | 重置是裸奔的破坏性操作  | 点了就重置，没有二次确认                                                                                                                                                |
| 4   | 两端权限各一套          | admin：`usePermission` + `PermissionWrapper`（`ClientOnly`）；web：`isAdmin`。写法与语义都不一致                                                                        |
| 5   | AI 对话想开放给试用用户 | 还没有"试用用户"这个身份，也没有任何配额概念                                                                                                                            |

**目标**：用**一套细粒度权限键**贯穿 web 与 admin，让"谁能看到/能用什么"可声明、可复用；头部按身份分档呈现；破坏性操作有确认；AI 试用有可演进（且不假装安全）的配额位。

## 2. 权限模型：细粒度 `permissionKeys`（Owner 选定）

沿用 admin 已有的形状（**不新建模型**），把它扶正为两端统一契约：

```ts
permissionKeys: string[]                       // 当前用户持有的权限键
hasPermission(key: string | string[]): boolean // 传数组 = 全部满足（AND）
hasAnyPermission(keys: string[]): boolean      // 任一满足（OR）—— 现有实现缺这条，需补
setPermissionKeys(keys: string[]): void        // 会话就绪时写入
```

### 2.1 权限键命名规范

`<域>:<动作>`，全小写，动作是动词；域与 `layers/` 的业务域同名（便于对照）。

| 权限键                        | 决定                                | 落点                                   |
| ----------------------------- | ----------------------------------- | -------------------------------------- |
| `Resume.Profile:view`         | 浏览公开简历（所有角色都有）        | 页面本身                               |
| `Resume.Display:view`         | 能看到「布局与风格」                | 展示设置抽屉的 tab                     |
| `Resume.Display:edit`         | 能切布局 / 风格                     | 该 tab 内的按钮                        |
| `Resume.Theme:view`           | 能看到「主题与背景」                | 抽屉 tab                               |
| `Resume.Theme:edit`           | 能切配色预设 / 明暗 / 背景          | 该 tab 内的按钮                        |
| `Resume.ThemeCustom:view`     | 能看到「自定义调色盘」              | 调色盘分组                             |
| `Resume.ThemeCustom:interact` | 能点「自定义」但会被拒（第三档）    | 调色盘分组的按钮（点击后提示权限不足） |
| `Resume.ThemeCustom:edit`     | 能用自定义调色盘（逐项改色）        | 调色盘分组内的输入框 / 取色器          |
| `Resume.Sections:view`        | 能看到「区块显隐」                  | 抽屉 tab                               |
| `Resume.Sections:interact`    | 能点区块开关但会被拒（第三档）      | 开关（点击后提示权限不足）             |
| `Resume.Sections:edit`        | 能改区块显隐 **+ 拖拽编辑简历模块** | 开关 / 页面上的拖拽手柄                |
| `Resume.Config:delete`        | 重置全部配置与内容（危险）          | 身份菜单                               |
| `Resume.Snapshot:create`      | 发布快照（将来）                    | 后续 publish 域                        |
| `AiTalk.Chat:view`            | 能看到 AI 对话入口                  | Header 第二档                          |
| `AiTalk.Chat:create`          | 能发起 AI 对话                      | AI 页 / 弹窗                           |
| `Admin.Console:view`          | 进入 admin 端（路由守卫用）         | `definePageMeta({ middleware })`       |

> **命名对齐后端**（Owner 2026-10-09 定）：沿用后端样例的 `域.资源:动作`（如 `Settings.Cases:edit`、
> `Leads.MyLeads:view`），动作取后端动词集 `view` / `create` / `edit` / `delete`。
> 这样后端 `permissionPermitKeys` 可以**直接喂进来判断、不需要映射表**；
> 上表的键名是先按同一规范起名，真实键名以后端契约定稿为准（改键名 = 改 `config/permissions.ts` 一处）。

**四态语义（Owner 2026-10-09 定，权限键"成对 + 第三档"的根据）**：

| 持有                         | 表现                                   | 落点                                                     |
| ---------------------------- | -------------------------------------- | -------------------------------------------------------- |
| 无 `view`                    | **不展示**（`v-if`）                   | 抽屉里整块 tab 不出现（`ResumeSettingsPanel` 过滤）      |
| `view` only                  | 展示 + **整组 disabled**（点都点不动） | `ResumeSettingsGroup` 的 `locked`（`fieldset disabled`） |
| `view` + `interact`          | 展示 + **可点，但动作被拒 + 提示**     | 动作层拦截（见 §2.5）                                    |
| `view` + `interact` + `edit` | 完整操作                               | 正常交互                                                 |

> 具体粒度以"**UI 上能独立出现/消失的最小单元**"为准：一个权限键对应一个可独立控制的入口。不要为"将来可能"提前铺键。

### 2.2 角色 = 权限键的**预设集合**（不是判断依据）

```ts
// 三种身份：guest（未登录）/ user（普通登录用户）/ admin（管理登录）
export const ROLE_PERMISSIONS: Record<Role, readonly PermissionKey[]> = {
  // 未登录：布局与风格、主题与背景**可以切**；「自定义调色盘」「区块显隐」只给 view → 展示但 disabled
  guest: [
    'Resume.Profile:view',
    'Resume.Display:view',
    'Resume.Display:edit',
    'Resume.Theme:view',
    'Resume.Theme:edit',
    'Resume.ThemeCustom:view',
    'Resume.Sections:view',
  ],
  user: [...guest 的全部, 'AiTalk.Chat:view', 'AiTalk.Chat:create'],
  admin: [
    ...guest 的全部,
    'Resume.ThemeCustom:edit',
    'Resume.Sections:edit',
    'Resume.Config:delete',
    'Resume.Snapshot:create',
    'AiTalk.Chat:view',
    'AiTalk.Chat:create',
    'Admin.Console:view',
  ],
}
```

> 落地位置：`apps/web/app/config/permissions.ts`（纯 TS、无 Vue 依赖）；P1 迁到 `packages/common` 供 admin 共用。

**约定：组件里只写 `hasPermission('resume:edit')`，禁止写 `role === 'admin'`。**
理由：`role === ...` 一旦散落，调整"某一档能做什么"就要改多处；权限键把变更收敛到上面这张表（这也是 Owner 选细粒度键的初衷）。

### 2.3 权限从哪来（优先级 + 兜底）

**优先级：后端返回的 keys → 角色预设表 → guest 最小集。**

```ts
// 后端有权限清单就用它；没有（未登录 / mock 阶段）才回退角色预设
const permissionKeys = computed(() => {
  const fromBackend = data.value?.permissionList?.flatMap(l => l.permissionPermitKeys ?? []) ?? []
  return fromBackend.length ? fromBackend : rolePermissions(role.value)
})
```

三处与"直接照抄旧项目写法"的差异（每一条都是会咬人的）：

1. **不要用 `permissionList[0]`**：它假设"只有一组权限"，后端返两组时会**静默丢一半** → 用 `flatMap` 合并。
2. **必须有兜底**：没有兜底时，未登录 / mock 阶段 keys 为空 → 所有 `hasPermission` 为 false → **页面全空**。
   所以 `rolePermissions()` 对未知角色也返回 guest 集，**绝不返回空数组**。
3. **补 `hasAnyPermission`**：现有 `hasPermission` 传数组是 `every`（AND），而"admin 或 member 都行"很常见；
   **不要偷偷改现有 AND 语义**（会静默改变 admin 端行为），另加 OR 版本。

`useAuthState` 的契约形状（两端统一，web 先落地）：

```ts
useAuthState(): {
  role: Ref<Role>                                    // cookie 持久化 → SSR 可读，首屏即真实角色
  user: Ref<{ name: string } | null>
  isAdmin: ComputedRef<boolean>
  signIn(input: { username: string; password: string }): { ok: boolean; message: string }  // P0 仍是 mock
  signOut(): void
  hydrate(): void                                    // 把 cookie 同步进共享状态（plugin 启用）
}
```

> **两端同一账号体系**（Owner 设想）：前端先统一这个**契约形状**，各 app 各自实现；
> 后端 auth 落地时两端换成同一个登录接口，前端判断代码零改动。

### 2.4 auth mock 的形状、身份与"待统一"的响应包装

mock（`apps/web/app/mock/auth.ts`）**按真实后端返回的形状造**，P2 接后端时只换数据来源：

```text
{ code, data: { token, refreshToken, oswUserInfo, oswCompanyInfo, permissionList }, msg, traceId }
```

| 身份         | 进入方式             | 权限来源                                                               |
| ------------ | -------------------- | ---------------------------------------------------------------------- |
| **游客**     | 不登录（没有 token） | `ROLE_PERMISSIONS.guest` 兜底                                          |
| **普通用户** | `user` / `user`      | `permissionList[0].permissionPermitKeys`（游客的全部 + AI 入口两个键） |
| **管理员**   | `admin` / `admin`    | 全量 7 个键                                                            |

- **token 存 cookie**（`my-resume.token`）—— 与请求层 `$request` 注入 `Authorization` 用的是**同一个键**，
  一个 cookie 同时解决"SSR 可读"与"请求带鉴权"；`useAuthState.hydrate()` 由 token 反解会话
  （mock 阶段本地反解；P2 换成"拿 token 请求 session 接口"，**只有这一个函数要改**）。
- **`role` 从会话派生**，不单独存 —— 避免"token 与角色不一致"。
- 旧数据迁移：`localStorage['my-resume.admin']` 与过渡期的 `my-resume.role` cookie 各读一次并转成 token。
- **`permissionForbidPaths`（接口级禁令）**已按后端字段保留，并提供 `usePermission().isPathForbidden(path)`。
  两种用法：**隐藏入口**（连入口都不给）与**能进但操作被拒**（入口照常、调用被禁接口时提示无权限）。
  本轮只落数据结构与查询，拦截逻辑随后续需求再加（mock 里给普通用户配了 `/resume/config/reset` 等作示例）。

> ✅ **已定（Owner 2026-10-09，做 P2 的 auth 公共部分时拍板）**：**让后端适配本项目** ——
> 后端统一输出 `{ success, data, message, timestamp }`（成功/失败同形状，见 `packages/common`），
> 并新增两个**可选**字段：`traceId`（链路追踪，成功失败都带）与 `errorCode`（机器可读错误码，仅失败）。
> 理由：`@template/common` 与 `$request` 已经在用这套形状，改后端只有 `apps/web/app/mock/auth.ts` 一处要动；
> 反过来改全仓（类型 + 所有调用方 + 文档）成本高得多。
>
> 实现与约定见 `docs/dev/api-conventions.md`。**auth mock 仍需在 P2 收尾时改成这套形状**
> （它现在还是 `{ code, data: {...}, msg, traceId }`）。

### 2.5 第三档 `interact`：能点，但会被拒（2026-10-09 追加）

Owner 的诉求是两档之外还有第三种：**游客"整块禁用"，普通用户"能点，但不能操作"**。
用 `view` / `edit` 表达不了（两者都没有 `edit`），于是加了**前端特有的一档**：

```text
XX:view       能看到
XX:interact   能点，但动作会被拒并提示   ← 前端特有
XX:edit       能真正修改（隐含 interact）
```

| 持有                         | 表现                                 |
| ---------------------------- | ------------------------------------ |
| `view` only                  | 展示 + 整组 `fieldset disabled`      |
| `view` + `interact`          | 展示 + 可点，但动作被拒 + toast 提示 |
| `view` + `interact` + `edit` | 完整操作                             |

**实现取舍（重要）**："能点但无效"**不是**把控件做成假的，而是在**动作层拦截** ——
无权限时不改 `model-value`，于是开关会弹回，同时给出明确提示。
否则用户会以为界面坏了，那比直接 `disabled` 更糟。

**接后端时的退化方案**：后端动词集只有 `view` / `create` / `edit` / `delete`，没有 `interact`。
若后端不加这个键，把 `usePermission` 里 `canInteractXxx` 的实现改成
"`hasPermission(view)` + 场景/角色判断"即可，**调用方零改动**（判断集中在 `usePermission`）。

## 3. 落点分层（不引第三套机制）

| 层                                         | 内容                   | 放在哪                                    |
| ------------------------------------------ | ---------------------- | ----------------------------------------- |
| 权限键常量、`ROLE_PERMISSIONS`、纯判断函数 | 与框架无关             | `packages/common`（纯 TS，可 `tsc` 构建） |
| `usePermission()` / `<AccessGate>`         | 依赖 Vue / Nuxt UI     | `packages/ui`（layer，两端共用）          |
| 会话实现（`useSession`）                   | 登录、恢复、写入权限键 | 各 app：`app/composables/`                |

### 3.1 依赖倒置：`packages/ui` 不读宿主的 session

```text
apps/web   → provideAccess({ permissionKeys, ready })   ← 来自 web 自己的会话
apps/admin → provideAccess({ permissionKeys, ready })   ← 来自 admin 自己的会话
packages/ui/useAccess()  → inject，只认「当前有哪些权限键」
```

这样 `packages/ui` 不需要知道"登录是怎么实现的"（web 是 mock、admin 将来接后端），组件也不会与某个 app 的 store 耦合。

### 3.2 SSR 与水合策略（重要，且决定 Header 能否稳定）

- 现状两个问题：① `PermissionWrapper` 内建 `ClientOnly`（SSR 完全不渲染、客户端才出现）；
  ② 登录态存在 `localStorage`（**SSR 读不到** → 首屏必然是 guest，水合后才"跳"成 admin）。
- **根本解法：让权限来源变成 SSR 拿得到的东西**（Owner 已确认换 cookie）：

  | 权限来源                   | SSR 能拿到？ | 策略                                             | 结果                     |
  | -------------------------- | ------------ | ------------------------------------------------ | ------------------------ |
  | **cookie**（role / token） | ✅           | `useCookie` + plugin 恢复 → **SSR 直出真实角色** | **无水合差异**（采用）   |
  | 服务端请求（session API）  | ✅           | SSR 内用 colada / `useAsyncData` 取；401 → guest | 无水合差异（P2 采用）    |
  | 只存 localStorage          | ❌           | 只能 `ClientOnly` 或水合后修正                   | 会闪、伤 SEO（**弃用**） |

  cookie 只放角色 / 会话标识，**不放敏感数据**；将来后端设为 `httpOnly`。
  迁移：读一次旧的 `localStorage['my-resume.admin']`，有值则写 cookie 并清除。

- `ClientOnly` 只留给"确实只能客户端知道"的**整块** UI（如高级编辑面板），不要滥用。
- 结构稳定仍是前提 —— 这正是 Header 选「分三档」而不是「条件平铺」的原因：未登录 / 已登录的**骨架一致**，只有身份区内容替换，不会整块跳变。
- `AccessGate` 提供两种降级，调用方按语义选：
  - `mode="hide"`（默认）：无权限则不渲染；
  - `mode="lock"`：渲染但置灰 + 提示「登录后可用」—— 用于"要让游客看见价值"的入口（如 AI 对话）。
- **不做 `v-can` 指令**：① 指令在 SSR 下水合风险高（服务端不执行、客户端执行）；② 表达不了 loading / 置灰 / 提示这些降级态；③ `AccessGate` 已覆盖它的全部场景，多一套 API 只是多一套心智。

### 3.3 为什么不做 Provider 组件树（Owner 已确认）

React 里必须用 Provider，是因为 Context **没有**「SSR-safe 的请求级全局态」；Nuxt 把这套做成了内建机制，
再包一层等于**重复机制**：

| 要透传的                  | Nuxt 原生对应物          | 说明                                                |
| ------------------------- | ------------------------ | --------------------------------------------------- |
| `role` / `permissionKeys` | `useState('auth-role')`  | 每请求独立 + 自动序列化给客户端（水合复用，不重算） |
| `locale`                  | `useState` + `useCookie` | SSR 读 cookie 定初始值 → 首屏即正确                 |
| 启动装配                  | `app/plugins/*.ts`       | SSR 与客户端**同一处**执行，避免两边逻辑分叉        |

**判据（什么时候才真的需要 `provide/inject`）**：

- 「**全局单例的请求态**」→ `useState` + plugin（当前情况，**不做 Provider**）；
- 「**树内上下文、且可能多实例/不同上下文**」→ `provide/inject`（例如同页两个区块用不同 locale）。

将来引入 `@nuxtjs/i18n` 时**它自带 plugin 与 `useI18n()`**，更不该手写 Provider。
本轮结论：composable 单例（`useAuthState` / `usePermission` / `useLocale`）+ `plugins/auth.ts` 装配。

### 3.4 三层落点：UI / 页面 / 接口（缺一不可）

"游客能浏览、配置要登录、高级配置只管理员"这句横跨三层，各自有正确的落点：

| 层         | 落点                                                                  | 管什么                                   |
| ---------- | --------------------------------------------------------------------- | ---------------------------------------- |
| **UI 层**  | `usePermission()` / `PermissionWrapper`                               | 入口显隐、按钮可用性                     |
| **页面层** | Nuxt **route middleware**（`definePageMeta({ middleware: 'auth' })`） | **能不能进这个页面**（admin 配置页必须） |
| **接口层** | 后端                                                                  | **真正的权限**；前端 keys 只做体验       |

**已落地（2026-10-09）**：

- web 的 `/ai-talk` 用 `middleware: 'ai-chat'` 守 `AiTalk.Chat:view` —— 没有该权限的人直接敲 URL 会被退回 `/resume`
  （**组件显隐挡不住直接输入地址**）；
- admin 的 `middleware/permission.ts` 是**骨架**，页面用
  `definePageMeta({ middleware: 'permission', permissions: ['Admin.Console:view'] })` 声明需要的权限；
  **过渡策略 = 没有权限数据就放行**（admin 还没接后端），**接后端后必须改成"空即拦"**。

> ⚠️ 只做 UI 显隐**不等于**做了权限：组件不渲染 ≠ 接口调不到。页面级用 middleware 兜，数据级必须靠后端（同 §5 的判断）。

## 4. Header 三档（Owner 选定）

```text
┌─ 左：品牌（logo + 名 + 说明）  ──── 中：滚动时的模块名 ──── 右：操作区 ───────────────┐
│                                                                                    │
│  右：① 常显（所有角色）        ② 登录后追加          ③ 身份区（最右，末端）          │
│      · 展示设置（布局/风格）      · AI 对话              · 未登录 → 「登录」按钮       │
│                                                        · 已登录 → 头像下拉菜单：      │
│                                                            保存状态 / 编辑模式开关   │
│                                                            / 重置（危险）/ 退出      │
└────────────────────────────────────────────────────────────────────────────────────┘
```

要点与理由：

1. **状态回显不再占 Header**：`保存中… / 已自动保存 · 刚刚` 移入「设置抽屉底部」与「编辑工具条」；Header 只在**编辑态**下用一个小圆点（hover 显示详情）表示"有未保存/保存中"。理由：它是**状态**不是**操作**，不该和按钮抢注意力。
2. **危险操作收进菜单**：`重置` 从主操作位移入身份下拉的"危险区"，点击后**弹二次确认**（`UModal`）—— 确认文案要写清"哪些会被清掉、能不能恢复"（本地配置与内容都能重置，且**不可恢复**）。
3. **登录前后右侧长度基本不变**：未登录是「展示设置 + 登录」，登录后是「展示设置 + AI + 身份菜单」，骨架一致 → 避免整条头部因登录而重排。
4. **品牌不挪到右侧**（Owner 提过）：品牌在左是阅读惯例；挪到右侧只会让左侧空、右侧更挤，**不解决"杂"**。要腾空间应做减法（见 1、2 条），而不是搬家。
5. **移动端（已落地 2026-10-09）**：`< sm` 时桌面按钮（展示设置 / AI 入口）`hidden`，改由一个
   「更多操作」菜单承载（`UDropdownMenu`）—— 与桌面端用**同一份权限判断**（`mobileMenuItems` 复用
   `canViewDisplay` / `canUseAiChat`），只是呈现方式不同，避免两处逻辑分叉；身份区在所有尺寸都在最右。

**落地（2026-10-09，P0 第一版）**：

| 档       | 实现                                                                                               | 权限键                                                                     |
| -------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ① 常显   | Header 的「展示设置」按钮                                                                          | `Resume.Display:edit`                                                      |
| ② 登录后 | 「AI 对话」按钮（功能未上线 → 占位且 `disabled`，避免"点了没反应"的假入口）                        | `AiTalk.Chat:create`                                                       |
| ③ 身份区 | `ResumeAccountMenu.vue`：未登录 = 登录按钮；已登录 = 账户菜单（保存状态 / 编辑模式 / 重置 / 退出） | 菜单项按 `Resume.Sections:edit`、`Resume.Config:delete` **逐项出现或消失** |

- 保存状态从 Header 主位撤进菜单；「重置」同样移入菜单，点击后**弹二次确认**（"不可撤销"写在弹窗里）；
- **编辑模式开关**：有编辑权限的人可切到"读者视角"预览 —— 它只是**视图开关**，不改变权限本身；
- `ResumeLoginButton.vue` 已被 `ResumeAccountMenu.vue` **取代并删除**：前者只能表达"登录 / 退出"，
  装不下"菜单项按权限出现"。

### 4.1 与既有 rail 方案的关系（必须对齐，避免两处打架）

`resume-display-architecture.md` §6.1「第 2 期」写过另一个落点：**把操作入口迁进左侧 56px 窄栏（rail）**，同样"按登录态分级"。
两者是**同一诉求的两种落点**，本次 Owner 选择 **Header 三档**，理由：

| 维度     | Header 三档（本次）            | 左侧 rail（§6.1 原案）                       |
| -------- | ------------------------------ | -------------------------------------------- |
| 改动面   | 只动头部与身份区               | 需要正文容器 `lg:pl-14` 偏移、新增 rail 组件 |
| 访客观感 | 公开站本色                     | 容易被误认为进了后台                         |
| 移动端   | 天然适配（本来就在头部）       | 仍需退回头部菜单（等于两套）                 |
| 扩展性   | 项变多时会挤（需及时收进菜单） | 竖向空间充裕                                 |

**结论**：rail 降级为**将来选项**（若操作项显著增多再启用）；本次沿用 §6.1 已定的契约形状
`ResumeChromeAction { key, label, icon, group, visible?, onSelect }`，但把 `visible`
从"按登录态判断"升级为**按权限键判断**（`visible: () => can('resume:edit')`）——
这样两种落点将来可以共用同一份 items 配置。

## 5. AI 试用与防滥用

**必须点破的判断：前端配额不是安全边界。** localStorage 计数、按钮置灰都能被绕过（改 localStorage / 直接调接口）。
所以职责这样分：

| 层       | 做什么                                                                  | 不做什么                   |
| -------- | ----------------------------------------------------------------------- | -------------------------- |
| 前端     | 显示"今日剩余 N 次"；超限置灰 + 写明恢复时间；引导登录/升级             | **不承担**"防止滥用"的责任 |
| 后端(P2) | 按账号或 IP + Redis 计数与限流（DAO-005 已把"限流"列为 Redis 用途之一） | ——                         |

- 前端配额形状先固定为 `{ limit: number; used: number; resetAt: string }`，P0 只留**类型与 UI 文案位**，不做真实计数；
- 未登录（`guest`）不显示 AI 入口；`member` 显示为可用；`admin` 不受限（便于自测）；
- 代码与文档都要标明：**这是体验限制，不是安全措施**，避免后人误以为已经安全。

## 6. 分期与验收

### P0（✅ 已落地 2026-10-09）：头部整理 + 三种身份 + 重置确认

- 范围：`ResumePageHeader`（右区分档）、`pages/resume/index.vue`（编排收口）、身份下拉菜单组件、
  状态回显迁移、重置二次确认（确认弹窗上提到 `packages/ui` 以便 web/admin 共用）、
  角色从 `isAdmin` 升为 `permissionKeys`（先在 web 层落地，键与映射按 §2）。
- **不动**：拖拽/编辑链路的实现（只是把入口与可见性换成权限判断）、AI 对话本体（未实现）。
- 验收：未登录 = 品牌 + 展示设置 + 登录；登录后 = + AI 入口 + 身份菜单（含保存状态/编辑开关/重置/退出）；
  重置必弹确认且取消后无副作用；`< sm` 不溢出；`prefers-reduced-motion` 下无额外动效；
  **SSR 无水合告警**（刷新时角色不"跳"，因为 role 来自 cookie）。

  **实测（真浏览器 11 项全过）**：游客 = 展示设置 + 登录；`user` = 多出 AI 入口与账户菜单（菜单**只有**"退出"）；
  `admin` = 多出 7 个拖拽手柄，菜单含保存状态 / 编辑模式 / 重置 / 退出；关闭编辑模式后手柄消失；
  重置先弹确认、取消后无副作用；三种身份**水合告警均为 0**。

  **仍未做**：`Admin.Console:view` 的路由守卫（middleware）、AI 对话本体（入口已占位）、移动端把次要项收进菜单。

### P1：抽公共层

- `packages/common`：权限键常量、`ROLE_PERMISSIONS`、纯判断函数；
- `packages/ui`：`useAccess()` / `AccessGate` / 确认弹窗；
- 迁移 `apps/admin` 的 `usePermission` 与 `PermissionWrapper`（保留一层薄兼容或直接改调用方，二选一，改动点要一次列清）；
- 验收：两端 `typecheck`；admin 的 `/comps/permission-wrapper` 示例页改到新 API 且行为一致；web 用同一套。

### P2：后端 auth + 配额

- `apps/api` 的 auth（登录发 token）+ 权限键下发 + Redis 限流；
- web / admin 换用同一登录接口；
- 前置：启动 PostgreSQL 与建库属环境变更，**需 Owner 明确授权**。

> **进度（2026-10-09）**：auth 的**公共部分已落地**（`apps/api/src/auth` + `common`）：
> `POST /api/auth/login` 签发 token、`GET /api/auth/me` 返回用户与权限键、全局 `JwtAuthGuard`
> 默认保护 + `@Public()` 放行、统一错误体带 `errorCode`。**尚未做**：用户持久化（现在用内存演示账号）、
> 前端换成真实登录接口、Redis 限流。

## 7. 不做 / 待定

- **不做** `v-can` 指令（理由见 §3.2）；
- **不做** 真实鉴权、自助注册、多角色管理 UI（P2 及以后）；
- **不做** 前端"防滥用"的强措施（因为不构成安全边界，见 §5）；
- **待定**：`user`（普通用户）身份怎么来（自助注册 / 邀请码 / 管理员开通）—— 直接影响 P2 的 auth 设计，需 Owner 在 P2 开工前定；
- **已定**：响应包装统一方向 —— 后端适配本项目，见 §2.4；
- **待定**：`users` 模块（持久化用户、bcrypt 密码、真实权限下发）—— 当前 `auth` 用内存演示账号，契约已预留。

## 8. 一句话总结

> **权限用键（`hasPermission('resume:edit')`），角色只是键的预设；头部按「常显 / 登录后 / 身份区」三档排，
> 状态回显与危险操作从主位撤下；前端配额只做体验，真实限制留给后端。**
