# 【DAO-030】admin 简历创建页（本期：父页 + 静态二级侧栏 + 新建大表单）

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`review-ready`（2026-10-14：实现完成、机器验证与质量门通过、**Owner 观感确认"这么改没问题"**；admin 侧已提交并推送，等 feature → dev 集成）
- Owner：`昇哥`
- 创建日期：`2026-10-14`
- 分支：`feat/38-admin-resume-create`（基于 `dev` 的 `c2c3723`；已推送，未合 dev）
- Issue：[#38](https://github.com/Fridolph/my-resume-fullstack/issues/38)
- 关联：`docs/admin/02_简历创建页_设计.md`（**唯一设计源**）、`docs/dev/07_简历系统_最小创建输入与默认补全.md`（#36 稀疏输入）、`DAO-029`（简历 CRUD，分工见下）、`DAO-028`（已 done，简历三表与接口由它建立）

## 分工（与 DAO-029 去重）

| 卡 | 承担 |
| --- | --- |
| **DAO-030（本卡）** | `/resume` **概览页**（列表 / 卡片两种呈现 + 新建入口）、**`GET /api/resume` 列表接口**、**`/resume/new` 创建页**、上传入口占位、稀疏提交 |
| `DAO-029` | 简历**重命名 / 软删除**（列表已随本卡提前落地，见「范围调整」；"新建"也归本卡） |

> ⚠️ 本表已按 2026-10-14 Owner 反馈调整：**二级侧栏不做**、**列表接口并入本卡**。
> 详见下方「范围调整（2026-10-14）」，原始记录保留在「状态轨迹」式的说明里，不做无声改写。

## 目标与边界

- 目标：`/resume` 是**简历概览**（进入即看到有哪些简历，可切卡片/列表，右上角新建），`/resume/new` 是**能用的创建大表单**；提交走稀疏输入（#36）。
- 范围（本期）：
  - 后端 `GET /api/resume`：本人未删除简历的列表（名字 / 语言 / 草稿版本 / 最近更新时间）
  - 契约 `resumeSummarySchema` + `resumeLocaleSchema`（后者同时收敛创建与列表的语言字段定义）
  - `/resume` 概览页：视图切换（卡片 / 列表，偏好记在本地）+ 右上角「新建简历」+ 加载 / 失败 / 空态
  - `/resume/new`：按契约 7 个区块组织的大表单（profile 必填，其余可空）、增删一条的交互、稀疏提交
  - 上传入口**占位卡片**（点击只给提示，**不做假交互**）
  - 页头搜索改为**按页面配置**（默认不出现）
- 非目标：自定义模块（`custom` 分支 → 独立 Issue #39，Owner 2026-10-14 确认本轮不做）；重命名 / 软删除（DAO-029）；真实「上传 → AI 分析 → 概览 → 确认」；`/resume/:id` 详情、展示配置、版本历史。
- 涉及文件 / 模块：
  - 后端：`apps/server/src/resume/{resume.controller.ts,resume.service.ts}`
  - 契约：`packages/common/src/resume/document.ts`
  - admin：`apps/admin/layers/11-resume/app/{pages/resume/index.vue,pages/resume/new.vue,apis/resume.ts,composables/useResumeList.ts,config/resume-create-schemas.ts,utils/resume-create-form.ts}`
  - admin 底座：`apps/admin/app/{components/admin/AdminHeader.vue,layouts/has-sidebar.vue,lib/query-keys.ts}`
  - **复用来源**（第一刀已解决）：`packages/ui` 的 `MySchemaForm.vue` / `MySchemaFieldInput.vue`（渲染）+ `packages/common/src/ui/form-schema.ts`（字段描述类型）；**字段表各端自写**，见「复用路径（已落地）」
- 风险与未知：
  - ~~复用路径未定~~ → 已落地（`ad3a0a9`）：渲染共用、字段表各端自写。
  - 稀疏输入的边界：哪些字段算"填过"、空的区块是否提交（依赖 #36 的 `resumeDraftInputSchema` 语义）。
  - 键名桥接：提交用契约的 `capabilities`，字段定义用编辑层的 `skills`，桥接只在 `toLegacySectionKey()` —— **创建页不应处理键名转换**，落地时验证这一点真的成立。
  - admin 与 web 都改 `/resume` 域，注意两端的 layer 各自独立。
- 验收：
  - `/resume` 是**概览页**：列出本人简历（卡片 / 列表可切换）、右上角有「新建简历」入口、空账号显示空态。
  - `/resume/new`：7 个区块齐全；profile 的姓名必填可拦截提交；其余区块可空；能增删条目；创建成功后概览页能立刻看到它（缓存已失效）。
  - 上传占位卡片存在且不做假交互；页头**默认没有**搜索框；二级侧栏已移除。
  - 质量门：`format:check` / `lint` / `typecheck` / `test` / `build` 通过（admin 侧重点 typecheck）。
- 第一刀：~~先定复用路径~~ → **已落地**（`ad3a0a9`）。

## 范围调整（2026-10-14，Owner 反馈后）

Owner 在首轮验收前给了四条反馈，据此**调整了本卡范围**（不是实现偏差，是范围本身变了）：

| # | Owner 反馈 | 处理 |
| --- | --- | --- |
| 1 | `AdminHeader` 中间的 Search 应可配置，不必每页都出现 | 已改：`showSearch` **默认 `false`**，页面用 `definePageMeta({ headerSearch: true })` 打开；布局经 `route.meta` 透传。顺带移除页头里写死的 `AD` 头像（与侧栏真实用户区重复且是假身份）与未实现的铃铛（点了无反馈＝假交互） |
| 2 | `/resume` 进来应是**简历概览**：列出简历（卡片 / 列表可切换），右上角新建入口，新建仍走当前创建页 | 已改：`/resume` 重做为概览页；**新增后端 `GET /api/resume`** 与契约 `resumeSummarySchema`；视图偏好记本地（仿 GS 的 `projects-layout-view`） |
| 3 | layout 与简历呈现可以一起调整 | 并入以上两条：页头可配置 + 概览页呈现 |
| 4 | 「自定义项」是不是漏了 | **本轮不做**（Owner 确认）：设计 §5 / P4 已把它拆成独立 Issue **#39**（`custom` 分支 + `view` 枚举 + 渲染注册表），它要动共享契约与 web 展示层，不与本卡混在一个分支 |

**连带影响**：原属 `DAO-029` 的「列表」提前到本卡（因为它只是概览页的数据来源，拆成两次做会让概览页先活在假数据上）；
`DAO-029` 现在只剩**重命名 / 软删除**。本卡原先做的「父页 + 静态二级侧栏」按第 2 条**移除**（`pages/resume.vue` 与 `config/resume-navigation.ts` 已删）。

> 侧栏移除的代价记在这里：将来出现 `/resume/:id` 详情、版本历史等兄弟页面时，需要重新决定导航形态
> （再做一层父页侧栏，或改成页内 tab）。现在不做，是因为它只有两项、其中一项就是当前页。

## 复用路径（已落地：渲染共用 + 类型上提 + 字段表各端自写）

> 本节原写的是「方案 A：把 `resume-editor-schemas.ts` 整体上提到 `packages/common`」。
> 实现时核实后发现该方案在数据模型层不成立，**实际落地方案与提交 `ad3a0a9` 一致**，本节按事实改写。

**为什么字段表不能整体复用**：web 的 `resume-editor-schemas.ts` 面向 `ResumeContent`
（`{ profile, highlights, skills }`，能力键名 `skills`），而创建页提交的是契约模型
`ResumeDocument['content'].sections[]`（判别联合，键名 `capabilities`）—— **两套不同的数据结构**，
强行共用会让编辑层类型与契约类型互相拉扯。所以拆成「渲染共用、字段表各端自写」。

### 实际落点（`ad3a0a9`）

| 层 | 落点 |
| --- | --- |
| 表单**数据描述**类型 | `packages/common/src/ui/form-schema.ts`（`FormFieldType` / `FormFieldSchema` / `FormSegmentSchema`），并 `export *` 进 `@rs/common` 入口 |
| 表单**渲染** | `packages/ui/app/components/MySchemaForm.vue` / `MySchemaFieldInput.vue`（按该层既有的 `My*` 前缀，**去掉 `Resume` 前缀** —— 它是通用「root + segments」表单） |
| web 侧引用 | `ResumeSectionEditorDrawer.vue` 改为自动导入 `MySchemaForm`；`resume-editor-schemas.ts` 的 `ResumeFieldSchema` / `ResumeFieldGroupSchema` 改为指向 common 新类型（保留原别名，标注 deprecated）；原 `components/resume/editors/` 目录已删除 |
| 顺带修掉 | 段标题边框原用 resume 域的 `var(--resume-border)`（搬到共享层拿不到），改用项目 token `border-default` |

设计文档 §3 已按核实结果同步修正为「渲染共用、字段表各端自写」。

### 已验证（`ad3a0a9` 提交信息）

- `pnpm typecheck` **6/6**、`pnpm lint` 0 warnings / 0 errors；
- 浏览器实测 web 草稿页的模块编辑抽屉：`dialogOpen: true`、表单内 **100 个输入控件**、字段 label 齐全、**0 console error**；
- Git 把两处移动识别为 rename（R094 / R082），确认只是搬迁未改逻辑。

## 设计与决策

| 决策 | 理由 / 证据 | 确认者 | 日期 |
| --- | --- | --- | --- |
| **复用路径落为「渲染共用 + 类型上提 + 字段表各端自写」** | 实现时核实：web 字段表面向 `ResumeContent`、创建页提交契约模型，是两套结构，整体上提会让类型互相拉扯（依据 `ad3a0a9`，设计 §3 已同步修正） | 落实于 `ad3a0a9`；原「方案 A（整体上提）」作废 | 2026-10-14 |
| **第一刀拆为独立提交** | 避免「搬移 + 新页面」混在一个大 diff 里，出问题难定位 | Owner 确认 | 2026-10-14 |
| 本期只做静态侧栏（P1） | 设计 §2：静态→动态是局部重构，猜错结构才是真坑 | Owner 确认 | 2026-10-14 |
| 上传走独立路由 + 通用接口，本轮只做占位（P3） | 设计 §4：多步流程套弹窗难处理；占位不做假交互 | Owner 确认 | 2026-10-14 |
| 提交用稀疏输入（#36） | 设计 §6：前端不必凑齐合法完整文档，服务端 `buildResumeDocument` 补全 | Owner 确认 | 2026-10-14 |
| 自定义模块拆独立 Issue（P4） | 设计 §5：会动共享契约，风险与创建页其余部分不同 | Owner 确认 | 2026-10-14 |

## 确认门与续跑

- 当前确认门：`无阻塞，已开工`（第一刀已落地）
- 已确认事实：设计 P1～P4 已拍板（设计文档 §8）；第一刀（共享表单上提）已由 `ad3a0a9` 落地并推送。
- 已进行：第一刀 = 上提（已完成，见「复用路径（已落地）」）
- 续跑第一刀：`/resume` 父页 + 二级侧栏（`layers/11-resume/app/pages/resume/index.vue` 改为父页 + `config/resume-navigation.ts`）
- 之后：`/resume/new` 大表单 → 上传占位 → 质量门与人工验收

## 执行与验证

| 类型   | 命令 / 样本 / 链接 | 结果 | 仍未验证的边界 |
| ------ | ------------------ | ---- | -------------- |
| 机器验 | `pnpm typecheck` / `pnpm lint`（第一刀，`ad3a0a9`） | 6/6 通过；lint 0 warnings / 0 errors | — |
| 机器验 | `pnpm format:check` / `lint` / `typecheck` / `test` / `build`（本刀） | 通过 | — |
| 机器验 | 编译并直接运行 `utils/resume-create-form.ts`（esbuild + node）：13 项断言全过 —— 转换产物通过 `createResumeSchema`、空条目/空链接/空公司被丢弃、日期转 `custom`、成果转 `textItems`、能力默认量尺 5 且维度留空、自我评价 trim 后过滤空行 | **13/13 通过** | — |
| 结构验 | `POST /api/resume`（最小输入：只有 profile）→ 服务端补全 | 200，返回完整 7 区块文档、`schemaVersion: 1`、`display.sections.order` 与区块数一致 | — |
| 结构验 | 无 cookie 访问 `/resume`、`/resume/new` → **302 /login**；带 cookie → **200**（SSR） | 通过 | — |
| 结构验 | `GET /api/resume`：带 token 返回本人未删除简历（`id / name / locale / revision / updatedAt`）；无 token → **401**；被软删除的测试简历**不出现**在列表里 | 通过 | — |
| 结构验 | 反馈后 `/resume` 的 SSR HTML：渲染真实简历名 / `rev 1` / 「更新于」/「新建简历」入口；**无** `placeholder="Search"`、**无**假头像 `AD`、**无**二级侧栏「所有简历」、**无**旧空态文案 | 全部符合 | — |
| 结构验 | Owner 第二轮反馈（layout）后：`/resume` 与 `/resume/new` 的 SSR HTML **含 `has-sidebar` 主导航（Dashboard / Comps）与 sticky 页头**、`<h1>简历</h1>` 正常；仍无二级侧栏、无页头搜索 | 通过 | — |
| 意图验 | 浏览器实点：视图切换（卡片 ⇄ 列表）与记忆、增删条目、标签回车、提交 → toast → 跳转、移动端布局 | **未执行** —— 本机沙箱下 Chromium 无法启动（写 profile / crashpad 路径被拒），自动化浏览器验证做不了 | **概览页两档呈现、创建页表单、页头观感需 Owner 实看**（见「交接」的验收清单） |

> ⚠️ 两次「只有 build / 只有跑起来才暴露」的错误，记在这里以免重犯：
> 1. `AdminHeader.vue` 一度出现**两个 `<template>` 块**（替换 script 块时把模板也写进了 new_string，原有模板未删），
>    `typecheck` 与 dev 都不报，**只有 `nuxt build` 报** `Single file component can contain only one <template> element`；
> 2. 删掉父页 `resume.vue` 后，`/resume` 与 `/resume/new` **漏了 `layout: 'has-sidebar'`**，
>    变成裸渲染（无主导航、无页头）—— `typecheck` 与构建都不会报这种"少了一层壳"的问题，
>    **只有真的打开页面/检查渲染结果才看得出来**。教训：删父页时，要把它承担的"壳"显式交回子页。
> 教训：改 SFC 时一次只动一个块；`build` 是这类错误的唯一机器出口，不能省。

## 交接

- 已完成：设计拍板并落档（`docs/admin/02`）；**第一刀**：共享 schema 表单上提（`ad3a0a9`）；**第二刀**：`/resume/new` 七区块大表单（增删条目、标签输入、稀疏提交、契约自检）+ 上传占位卡片；**第三刀（Owner 反馈后）**：范围调整 —— `/resume` 改为**概览页**（新增 `GET /api/resume` 与 `resumeSummarySchema`，卡片 / 列表两档 + 本地记忆），移除二级侧栏，页头搜索改为按页面配置；前置 DAO-031（admin 真实登录）已同时交付
- 当前状态：`in-progress`（代码与机器验证完成，等 Owner 的观感验收）
- 阻塞：无
- 下一步第一刀：Owner 验收（下方清单）→ 按其反馈微调 → 本地提交
- **Owner 验收清单**：
  1. 打开 <http://localhost:4047/login>，用本地演示账号 `super` / `super!` 登录（字段是**用户名或邮箱**）；
  2. 登录后刷新仍是登录态；侧栏底部显示「超管」；点它 → Sign out → 回到登录页；
  3. `/resume`：应直接是**概览**（无二级侧栏）——能看到已有简历、右上角「新建简历」、右上角切换**卡片 / 列表**，切完刷新页面偏好还在；页头**没有**搜索框、**没有**假头像；
  4. `/resume/new`：填写姓名后点「创建简历」应成功（toast + 回到概览并能立刻看到新建的这份）；只点「新增一项」不填内容不会被提交；把某条链接的 URL 留空再提交，应看到「还不能创建」的提示而不是后端报错；
  5. 桌面与移动端各看一遍（概览的卡片网格在窄屏应落成单列 / 两列）。
- 文档锚点：`docs/admin/02_简历创建页_设计.md`、`docs/dev/07_简历系统_最小创建输入与默认补全.md`
- 集成锚点：`待 feature -> dev`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：待补
- Git / PR：待补
- 常规提交：待补
- Dao Commit：`不适用`（尚未到集成边界）
- 沉淀候选：`无`
- 收口备注：
