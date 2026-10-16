# AGENTS 协作规范

本仓是 **`Dao-is-Coding` 的进行时验证仓**，也是 `my-resume` 真实业务开发的实现场 —— 底座沿用供 `dao-*` 项目复用的全栈模板（源自 `dao-monorepo-temp`），但这里跑的是真业务：用熟悉的 Nuxt 4 + NestJS 栈逐模块把简历系统、用户与权限实现出来，再把验证过的结论带回 `my-resume` 仓，用 React + Next.js + Python 重做同一套功能。它**不是** `Dao-is-Coding` 母仓：项目内的业务、实现和局部经验留在这里；经验证且跨项目成立的规则，才以候选形式回灌母仓。

更深层目录中的 `AGENTS.md` 可补充具体实现约定；安全要求与本文件的主线、验证、归母边界不得被弱化。

## 1. 项目定位与边界

- **本仓是进行时验证仓，不只是模板**：底座提供可复用的工程能力，但项目的价值在于**在真实业务约束下验证**——简历系统（个人能力、风格、编辑、版本发布）、用户与权限、账号与会话都在这里实装，而不是停留在范例层面。
- 分层看待底座与业务：底座是多个项目可复用的工程能力（骨架、公共组件、校验与工具），保持通用、可抽离；`my-resume` 的业务实现放在应用自身的业务域 layer 与后端模块内，不反向污染底座能力。
- 当前技术栈为 `pnpm workspace`、Turborepo、Nuxt 4、Nuxt UI、Tailwind CSS 4、`@pinia/colada`、NestJS、Prisma、PostgreSQL、Redis 与 TypeScript。
- `apps/web` 是用户端，`apps/admin` 是管理端，`apps/server` 是后端服务，`packages/common` 存放跨应用的稳定类型与基础能力。
- 业务按模块推进：一个任务卡只落一个模块或一条闭环，不顺手扩展相邻模块；未定的选型写进任务卡待确认项，不靠猜测落地。
- 新增目录、包、基础设施或共享契约前，先说明动机、影响范围、回滚方式，并同步更新 README。
- **多会话并行时必须各自使用独立 git worktree**（Owner 2026-10-16 定的约定）：
  同一个工作目录里两个会话同时动，会撞分支（一个切走、另一个的提交落到错的分支上）、
  撞卡号、并让 `git add` 把别人的在制品一起提交。做法：
  `git worktree add ../<repo>-worktrees/<branch> <branch>`，各会话在自己的目录里改与提交，
  完成后 `git worktree remove`。**共享目录里不要用目录级 `git add <dir>`** —— 只逐文件精确暂存。
- ⚠️ **worktree 选址的三条现实约束**（2026-10-16 实测，都真实失败过；原约定里的
  `../<repo>-worktrees/<branch>` 在本环境**不可用**）：
  1. **仓库外建不了**：文件沙箱只允许写工作区内，`git worktree add ../…` 报
     `Operation not permitted`。
  2. **嵌套在仓库内会让 pnpm 崩**：如 `.local/worktrees/…`（虽然 `.local` 已被忽略、
     也不会污染 `git status`），`pnpm add` 会因与父仓库的 store / `node_modules`
     冲突而失败（`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`）。
     纯 `pnpm install` 尚可，但 `add` / `remove` 不行。
  3. **放 `/tmp` 会被系统回收**：实测同一会话内目录就被清掉过一次，`node_modules` 白装。
  **结论**：本环境用 `/tmp/<短名>`，**开工前先确认目录还在**（`ls` 一下）；
  被回收就按上面的引导序列重建（约 1 分钟）。若将来沙箱放宽，回到 `../<repo>-worktrees/<branch>`。
- **新 worktree 必须走引导序列**，否则 `typecheck` 会报一堆"模块找不到"的假错误
  （本轮实测 49 个，全都不是代码问题）：
  1. `pnpm install --frozen-lockfile`（`node_modules` 不跨 worktree 共享）
  2. `pnpm --filter @rs/common build`（共享包产物 `dist/` 不在版本控制里）
  3. `pnpm --filter @rs/server exec prisma generate`（Prisma client 生成到 `src/generated/`，同样不入库）
- ⚠️ 判断命令成败时**不要用 `cmd | tail`** 看结果：管道的退出码是 `tail` 的，失败会被吞掉
  （本轮我因此把一次 `typecheck` 失败误当成通过并照常提交）。要么不加管道，要么 `set -o pipefail`。
- 分支模型：**所有开发只在 `dev` 或从 `dev` 检出的短分支上进行**
  （`feat/<issue>-<slug>` / `fix/…` / `docs/…` / `chore/…`），验证完成后合回 `dev`。
- ⚠️ **`main` 上不进行任何开发与操作**（Owner 2026-10-16 明确的硬规矩）：
  不在 `main` 上提交、合并、打 tag、checkout 或跑发版命令 —— `dev → main` 的集成与推送
  **由 Owner 手动执行**。AI 的职责边界停在 `dev`。
  这不是形式要求：`main` 是发布面，任何本地实验都可能被误当成"已发布"。
  完整流程见 [docs/dev/01_开发流程_分支与提交.md](./docs/dev/01_开发流程_分支与提交.md)。

## 2. 安全与隐私

- 不读取或输出 `.env`、密钥、令牌、私有配置等被忽略的用户文件；需要变量时，只新增或更新脱敏的 `.env.example`。
- 密钥、数据库连接和第三方服务配置只能在后端环境变量中使用，禁止进入前端运行时配置、源码、日志或提交记录。
- 涉及环境变量、数据库、Docker、CI/CD、依赖升级或 API 契约变更时，先暂停并向 Owner 说明影响、迁移和回滚方案。

## 3. Dao-is-Coding 最小运行方式

这套流程不是线性仪式，而是让任务在真实开发中持续可判断、可交接、可收口：

```text
L2：按需过门判断
L4：任务持续流转
L3：真实变化到点后留下语义锚点
L5：按需沉淀与归母判断
```

### 3.1 状态与过门

默认状态流：

```text
planned -> designed -> in-progress -> self-tested -> review-ready -> done
                         \-> blocked
```

- `planned`：目标已清楚，但尚未形成可开发的最小设计交接。
- `designed`：目标、边界、依赖、验证入口和涉及文件已足以开做。
- `in-progress`：正在实现；只处理本轮范围。
- `self-tested`：实现已完成本地验证，但尚未形成可审看交接。
- `review-ready`：交接包和验证证据齐全，可自审或交他人审看。直接在 `main` 开发时，它不要求必须有 PR。
- `done`：本轮目标、问题和必要文档均已收口；提交或合入只是常见工程表现，不替代收口判断。
- `blocked`：写清卡点与解除卡点的第一步；它不是假装继续推进，也不是直接放弃。

每次从一个状态进入下一状态，至少检查：意图是否清楚、边界是否稳定、下一环是否有足够承载、风险是否可控、验证入口是否明确。未成熟，不越位。

### 3.2 开工、交接与收口

- 开工前先写清：目标、非目标、涉及文件、风险、验收标准与第一步。需求模糊或边界可能扩张时，使用 `dao-grill` 做最小对齐；明确小改不机械触发。
- 中途换窗口、模型或协作者时，使用最小交接包：`目标 / 状态 / 已完成 / 下一步 / 阻塞 / 自测 / 文档锚点 / 集成锚点（如适用）`。其中“下一步”必须是接棒后的第一刀。
- 收口前先自查：是否达成目标、是否越界、验证是否真实完成、是否有隐藏风险、API/类型/文档是否同步、是否需要沉淀。需要时使用 `dao-review`，它不替代代码 review 或测试。
- 对存在协作切换、风险、跨文件影响或阶段性价值的关键任务，在 `dao/` 创建一张任务卡，并由 `dao/CURRENT.md` 指向当前唯一关键任务。任务卡是目标、状态、验证、交接与收口的唯一事实源；小修不必机械建卡。完整规则见 [`dao/README.md`](./dao/README.md)。任务完成即收口：状态改 `done`、回填并关闭对应 Issue、把该卡从 `dao/CURRENT.md` 移出 —— 细则与盘点命令见 `dao/README.md` →「完成后立即收口（避免积累）」。

### 3.3 单 Task 全栈闭环开发模式

- 一轮只推进一个模块或一条最小业务闭环；后端、共享契约、前端与验证都必须围绕同一个 Task 收口，不顺手扩展相邻能力。
- 标准顺序：`Grill → 任务卡 → 讨论文档 → Owner 确认 → Issue/短分支 → 表结构与迁移 → 共享契约 → 后端接口 → 后端验证 → 前端模块 → API 对接 → 桌面/移动端人工验收 → Review → 文档回填 → 提交 → 推送并合回 dev`（推送 `dev` / 开发分支自行判断，见 §4；`dev → main` 归 Owner）。
- 讨论阶段先提供 Markdown 模板和当前理解；Owner 表达业务理解后，AI 负责解释职责、补齐边界、给出字段/表结构候选、接口契约和程序化伪代码。Owner 确认前不写源码、schema、迁移或完整接口实现。
- 程序化伪代码按输入、身份校验、条件分支、读写顺序、失败出口、返回值、事务边界与并发条件组织；不以业务散文或直接复制源码替代。
- Issue 必须记录已确认方案、范围、非目标、验收入口、测试计划、讨论文档链接和回滚方式；分支名带 Issue 编号。一个 Issue 可包含多个连续用例，但每次只实现一个可独立验证的用例。
- 接口契约、权限、交互状态和测试计划在设计阶段一起明确；需要数据库变更时，再按 `schema.prisma → 生成并审查 migration SQL → 在已确认环境应用 → generate → Zod/共享类型 → Service → Controller → OpenAPI/Apifox` 交付。无需数据库变更的 Task 跳过迁移，不机械补层。前端消费稳定契约，不直接依赖 Prisma 模型或数据库字段。
- AI 可以主动运行格式检查、lint、typecheck、单元测试和构建；本地接口测试须使用已确认的本地或测试环境，写入限定测试数据并安排清理。迁移、seed、外部 Apifox 写入、环境变量、部署和发布仍遵守安全门，涉及这些动作时先说明影响、回滚与授权边界；已有明确授权则直接执行，不重复询问。
- 测试计划从分析开始，按风险验证契约、权限、业务规则、并发及关键链路；测试先行按需采用。测试脚本返回成功但没有执行测试时，记录测试缺口，不宣称功能通过；新增测试依赖先说明用途和兼容性。
- AI 每个阶段解释“为什么这样设计、输入输出是什么、怎样验收”，Owner 提供业务样本并参与关键判断；按已确认的任务连续推进，不能一次铺满未确认设计或以大段实现替代教学。
- UI/交互必须同时做机器检查和 Owner 的桌面/移动端意图验收；“机器通过”不等于“观感和操作通过”。后端异常路径、权限、并发和数据迁移也必须有对应验证记录。
- 收口前执行 `dao-review`：确认目标、边界、验证证据、文档、API/类型同步和未验证边界；普通 Task 使用 Conventional Commit，只有集成边界才使用 Dao Commit。推送 `dev` / 开发分支不需另行请示（见 §4）；**"已发布"只以 `main` / tag 为准**。
- 后端默认采用 Controller → Service → PrismaService；查询复杂、跨用例复用或需要隔离持久化实现时采用平级 Repository，不强制增加转发层。输入类型统一 `Dto` 后缀，参数使用对应类型的小驼峰名称（如 createUserDto）。
- 优先采用 Nest 官方集成与成熟依赖来减少模板代码、明确职责，不以零依赖为目标。本项目鉴权采用 `@nestjs/passport` / `passport` / `passport-jwt`，保留 `@nestjs/jwt` 签发令牌；Guard 处理公开路由与错误语义，Strategy 认证后委托 Service 恢复身份。其他新依赖仍按任务范围说明用途和兼容性。
- 模块方法使用多行 TSDoc：除职责外，补充必要的设计理由、业务边界、事务/并发与安全取舍，可作为学习与面试复盘材料。注释必须符合当前实现，不重复逐行代码，不沿用已失效的设计描述。
- 例如 JWT 注释应说明签名不等于加密、sub 的身份含义、权限恢复策略与代价；当前按 sub 每次回查数据库，不能写成“权限变化只能等 token 过期”。较长的流程图与延伸讨论保留在业务文档。
- 当前项目默认采用上面的单 Task 全栈闭环。Owner 仍负责产品意图、数据破坏性动作、外部服务写入、桌面/移动端观感和最终发布判断；AI 负责可重复的机器验证、证据回填和风险提示。
- 若某一轮明确切换为学习演示模式，任务卡必须写明“验证由 Owner 执行”及未运行命令；否则不能用历史上的“未运行验证”约定阻止本轮已授权的自动化检查。

## 4. 工程原则与验证

- 先明确目标、非目标、风险、改动文件和验收标准，再开始实现；任务变大时拆分，不顺手扩展无关范围。
- 主线重于扩展，验证重于堆功能，决策与取舍应在代码或文档中可追溯。
- 优先小步、可验证、可回滚的改动；相同逻辑出现三处以上再抽取公共能力，避免过度抽象和过早优化。
- 先建 Issue 再写代码：Issue 写明背景、目标、非目标、范围、验收与测试计划；分支名带 Issue 编号；发现旁支问题时记录为独立 Issue，除非它直接阻塞当前验收，否则不得混入当前改动。
- API、共享类型或目录结构改变时，同步检查调用方、README、测试和相关文档。
- TypeScript 保持严格类型；前端使用 Vue Composition API 与 `<script setup lang="ts">`；NestJS 按 module、controller、service 与 common 边界组织。
- 测试文件优先放在对应模块的 `__tests__/` 目录，验证真实行为，不提交只为凑覆盖率的模板测试。
- UI 改动必须验证桌面端与移动端关键路径；后端改动必须验证对应接口及异常路径。
- **提交时机按"能不能被机器验证"分层**：
  - **UI 与交互**（视觉 / 布局 / 动效 / 手感）：机器验证只证明"没坏"，不证明"对"。改动先留在工作区并说明"看哪里、看什么"，**经 Owner 实看确认后**再提交；未确认前不要用 squash / 合并带进 `dev`。
  - **其余**（后端 / 共享契约 / 文档 / 构建配置等可机器验证的部分）：**自测通过即可在当前分支本地提交**，不必逐次确认 —— 一个 task 补充完善且 `typecheck` / `lint` / 实测通过，就该落成提交，别把改动攒在工作区。
  - **推送远端** —— 闸门设在 **`main` 与发版**，不设在"推送"这个动作上：
    - `dev` 与从 `dev` 检出的开发分支：**AI 自行判断并推送**，不必逐次请示。
    - `main`（含 `dev → main` 的集成与推送）与发版（tag / release）：**归 Owner**，见 §1 与 §7。
    - **"已发布"只以 `main` / tag 为准**；`dev` 是**开发流程记录**，不是发布面。
    - **推 `dev` 之前先 `git fetch origin` 并确认是 fast-forward**，非 ff 就先整合
      （`git rebase origin/dev`）再推。多个窗口都能推 `dev`，直接推会被拒、白跑一趟 ——
      2026-10-16 实际发生过一次。

    > **为什么这样分工**（Owner 2026-10-16 定）：要求 Owner 为每一次 `dev` 推送点头，
    > 会把注意力耗在流程细节上 —— 而 `dev` 本来就是一条**可回看的开发流程记录**。
    > Dao Commit 的设计初衷正是这个场景：**AI 对 `dev` 上的推进负责，Owner 对发布负责**。
    > 所以"本地提交 ≠ 已发布"这条仍然成立，但它约束的是**发布判断**，不是**推送动作**。
- 提交前至少执行 `pnpm check`（= `release-notes:check` → `format:check` → `lint` → `typecheck` → `test`）
  和受影响范围的构建；若项目尚无测试，说明缺口而不是伪造测试。
- **`test` 必须能区分"通过"与"没有测试"**：三个包的脚本都带 `--passWithNoTests=false`。
  历史上用 `node --test` 时，测试文件被删光仍以 0 退出（实测 `# tests 0 / # pass 0`，Turbo 报 3/3 successful）——
  质量门"全绿"却什么也没验证。
- **`release-notes:check`** 校验 `CHANGELOG.md` 与 `packages/common/src/ui/release-notes.ts` 是否同步
  （后者由 `scripts/sync-release-notes.mjs` 生成，发版时挂在 `release-it` 的 `after:bump` 钩子上）。
  发版后忘了同步，这道门会红，而不是让 release notes 页面悄悄停在旧版本。

### 4.6 共享层归属判据（三层）

新增"想给两端共用"的东西前，先判它属于哪一层：

| 判据 | 落点 |
| --- | --- |
| 能脱离 Vue / Nuxt 运行（类型、校验、算法、常量） | `packages/common`（`@rs/common`） |
| 碰 Vue 或 Nuxt UI，但**不含业务语义** | `packages/ui` |
| 含业务语义（业务域类型、业务组件） | 各端自己的 layer；**两端都要**才上提 |
| 应用专属外壳（页面、布局、导航） | `apps/*/app` |

配套规则（都是实际踩出来的，不要绕过）：

- `packages/ui` **只描述"能做什么"，不判断"谁可以做"**：能力经 props / slots / composable 注入
  （`MySchemaForm` 的 `list-item-extra`、`MyModal` 的 `footer`、插件的 `$api`）。
- `packages/ui` 的 dependencies 只放 Vue 生态基础库（`@vueuse/*`）；**重量级引擎走 peer** 由宿主提供
  （如 `sortablejs`）；`vue` 走 peer + dev。
- ui 组件里含 **Tailwind 类名字面量**的，必须能被宿主的 `@source` 扫到；
  纯 TS 包（common / utils）**不要放类名** —— 不会被扫描，生成不出样式。
- 组件的 props 类型**在 ui 内定义**：`defineProps<整个外部类型>()` 指向 `@rs/common` 会在 dev 崩
  （SFC 编译器不展开包的 re-export 链，只有 dev 报错）；layer 的 `alias` 也**不合并到宿主**。
- 迁移时**保留调用面**（原处留一行 re-export），搬移保持纯位移、零调用点改动，清理留给后续。
- 纯前端换算与通用工具放 `@rs/utils`；**与具体接口/后端约定绑定的**（表单字段名、响应解包、端点路径）
  留在业务侧 —— 共享层不认接口。
- 分层理由与本次踩坑的完整记录见 [`docs/web/03_Layers_分层约定.md`](./docs/web/03_Layers_分层约定.md) §8。

## 5. Skills：使用、安装与边界

Skill 是个人 Codex 环境能力，不是本模板的运行时依赖；不要把全局 skill 复制进项目，也不要让业务代码依赖某个 skill 路径。

### 5.1 当前 Dao 核心 skill

当前环境已具备并可直接使用以下七项，规范源位于 `Dao-is-Coding/60-器-技能与构建/00-技能/`：

| Skill            | 何时使用                                               | 是否每轮必用 |
| ---------------- | ------------------------------------------------------ | ------------ |
| `dao-intro`      | 新伙伴、新模型或新仓首次传承 / 回锚                    | 否           |
| `dao-grill`      | 开工前目标、边界或验收仍不清楚                         | 否           |
| `dao-handoff`    | 换窗口、模型或协作者，需要不断棒                       | 否           |
| `dao-review`     | 自测后判断能否进入收口                                 | 否           |
| `dao-commit`     | `feature -> dev` 或 `dev -> main` 的集成 / squash 收口 | 否           |
| `dao-return-dao` | 判断经验应留项目、候选观察还是归母                     | 否           |
| `dao-role-map`   | 多项目/多方向并行时判断身份与主线                      | 否           |

- 日常开发、流程修订和单任务收口使用 Conventional Commits。`Dao Commit` 只用于集成边界：多个普通提交在 `feature -> dev` 或 `dev -> main` 合并 / squash 后，形成一条值得长期回看的净变化时才使用。它的格式为 `[上卦下卦][卦名] type(scope): subject`；AI 只起草候选，最终定锚责任在人。
- 当前核验中，`dao-intro`、`dao-grill`、`dao-handoff`、`dao-review`、`dao-return-dao`、`dao-role-map` 已直接链接到母仓源；`dao-commit` 为独立副本，且与母仓源存在版本差异。两者都可使用，但更新前必须先确认哪一侧是权威版本，不能单向覆盖。
- 新仓由模板复制后，先使用根目录 `.dao-seed/` 与 `dao-intro` 完成初次传承：AI 复述理解、最多补三问、预览 `.dao/` 传承包；只有 Owner 明确确认后才可写入 `.dao/`。`.dao/` 管项目身份与母仓锚点，`dao/` 仍是关键任务运行面，两者不竞争状态主位。
- 本地环境缺少任一 Dao skill 时，先从母仓的上述规范源安装或建立统一链接，再验证可用性；不要从子项目复制一份并自行分叉。安装/更新属于个人工具环境变更，应单独记录版本或来源。
- 如母仓 skill 更新，子项目只在确认影响后更新本机安装源；不要因为 skill 更新自动改写项目代码或项目流程。

### 5.2 通用 skill 的选择

- Vue/Nuxt 工作优先使用 `vue-best-practices`、`nuxt` 和 `nuxt-ui`；Vue 任务必须遵循 Vue skill 的约定。
- UI、可访问性、性能和浏览器验证，按需使用 `frontend-design`、`accessibility-compliance`、`performance`、`webapp-testing`、`playwright-*` 等已提供能力。
- TypeScript、代码评审、发布等能力按任务触发；例如 `typescript-expert`、`frontend-code-review`、`vercel-deploy`。部署、外部服务或环境变量变更仍须先获得 Owner 明确授权。
- 需要新能力时，先用 `find-skills` 检索、说明候选与安装来源；未经 Owner 确认不得安装。未找到 skill 时，优先用现有工程规则完成工作，而不是制造替代性流程。

## 6. 母仓与子仓的双向流转

`Dao-is-Coding` 母仓负责定义与校准跨项目范式；本项目负责在真实约束下验证。两者都不应覆盖对方的职责。

### 6.1 子仓回灌母仓

发现新规则、流程、命名、约束或母仓定义需要修订时，先保留在本项目的任务记录或经验文档中，并使用 `dao-return-dao` 判断。只有同时满足以下条件，才提出回灌：

1. 已在真实场景中验证；
2. 不只是本项目的业务或临时实现细节；
3. 能让另一个项目或后来的协作者更清楚。

回灌候选至少写明：项目与事件、涉及的 Dao 层级、可复用判断、反例或证据、建议落点、结论（留项目 / 候选观察 / 正式回灌）与下一步。不要直接把项目文档整段复制到母仓，也不要把一次灵感升格为正式规则。

### 6.2 母仓更新子仓

母仓的有效更新会通过其自身的文档与 skill 版本传播到子仓。子仓接收更新时：

1. 先确认更新解决的是什么问题、影响哪些任务或约定；
2. 再选择性更新本机 Dao skill 或本仓 `AGENTS.md` / `README.md`；
3. 对受影响的进行中任务补充交接、验证或迁移说明；
4. 记录采用的母仓版本/提交和本仓影响。

母仓不是子仓的实时运行时依赖；更新必须经过当前项目验证，不能静默覆盖业务决策或项目级规则。

## 7. 文档、提交与发布

- 文档以中文为主，除“怎么做”外，还应记录关键决策的背景、取舍与结论。
- 日常提交使用 Conventional Commits：`<type>(<scope>): <description>`，常用 `feat`、`fix`、`docs`、`test`、`refactor`、`chore`。
- **`dev → main` 走 PR**（Owner 操作）：PR 的 squash commit message 用 Dao Commit 格式。
  这样"集成锚点"与"可审阅记录"是同一件东西。
  ⚠️ 教训：本仓首次 `dev → main` 是直接推送的，事后**无法补 PR** ——
  等 push 完成，`main` 与 `dev` 树已一致，PR 的 diff 为空、只剩形式。
  要留 PR 记录就必须**在推送前**开，而不是事后补。
- 使用 `release-it` + `@release-it/conventional-changelog` 在稳定发布节点生成版本提交、Git tag 与 `CHANGELOG.md`；
  发布前必须确保工作区干净（`requireCleanWorkingDirectory`）且质量检查通过。
  ⚠️ 配置里的 `requireBranch: main` 意味着**发版命令只能在 `main` 上跑** ——
  而按上面的规矩，**这一步由 Owner 执行，AI 不在 `main` 上操作**。
  AI 可以准备配置、脚本与文档，并在 `dev` 上验证它们，但不代跑发版。
- **安全默认**：`.release-it.json` 里 `git.push: false`、`npm.publish: false`、`github.release: false`；
  `requireBranch: main`。发版只在本机改文件与打 tag，**推送是单独一步**。
  ⚠️ 这里的"单独一步"指的是**发布产物的推送**（`main` / tag）—— 仍归 Owner；
  与 §4 允许 AI 自行推送 `dev` / 开发分支是两件事，不要混。
  ⚠️ `release-it` 的默认行为包含推送，所以这几项必须显式关掉。
- **发版会一并更新 release notes 页面**（Owner 2026-10-16 的约定）：`after:bump` 钩子跑
  `scripts/sync-release-notes.mjs`，把 `CHANGELOG.md` 同步进 `packages/common/src/ui/release-notes.ts`
  （admin 的 `release-notes.vue` 读它）。数据在共享包、页面只渲染 —— 发版工具**不需要改 `.vue` 源码**。
- `CHANGELOG.md` 与那份数据的一致性由 `pnpm release-notes:check` 把关（已纳入 `pnpm check`）。
- 详细脚本与操作步骤见 README。
