# 【DAO-013】新建 packages/ui 共享 layer：AppDrawer / AppModal

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`self-tested`
- Owner：`昇哥选定方案（Nuxt layer 不用 npm 包）、组件形态（抽屉为主 + Modal 窄屏退化）与 demos 位置（admin）`
- 创建日期：`2026-10-07`
- 卡号说明：`原为 DAO-012；并行分支 feat/18-resume-theme-custom 已占用该号（主题与自定义调色盘），本卡避让为 DAO-013`
- 关联：`Issue #20`、`apps/admin/app/components/modal/Responsive.vue`（既有实现，将来收敛对象）、`packages/common`（分工对照组）、`docs/dev/layers.md`、`packages/ui/README.md`

## 状态轨迹

| 迁移                      | 依据                                                                                     | 确认者     | 日期       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ---------- |
| `planned -> designed`     | 核实了 monorepo 现状（`packages/common` 只放纯 TS；admin 已有 `ModalResponsive` 但 web 用不到；两端都没 `extends`），Owner 选定三项 | Owner 确认 | 2026-10-07 |
| `designed -> in-progress` | Issue #20 已建；分支 `feat/20-shared-ui-layer` 从 dev 开出                              | 归枢记录   | 2026-10-07 |
| `in-progress -> self-tested` | layer 与两个组件完成；两端 typecheck、oxlint 通过；`/demos/overlay` SSR 正常、断点退化经真实浏览器验证 | 归枢记录 | 2026-10-07 |

## Grill：开工前对齐

- 目标：新建 `packages/ui` 作为**跨 app 共享的 UI 组件 layer**（零构建、自动导入、类型自动生成），封装 `AppDrawer`（抽屉）与 `AppModal`（桌面对话框 / 窄屏退化为抽屉），并在 admin 的 demos 目录加示例页。
- 边界：只新增 `packages/ui/**` 与「两个 app 的 `extends` + Tailwind `@source`」+ admin demos 页与导航 + 文档；不改任何现有浮层用法。
- 不做：不在本轮替换 `UDrawer` / `UModal` / `ModalResponsive`（另开任务）；不加其他共享组件；不给 layer 加运行时依赖；不动 `packages/common`。
- 涉及文件 / 模块：`packages/ui/{package.json,nuxt.config.ts,README.md,app/components/AppDrawer.vue,app/components/AppModal.vue,app/composables/useNarrowScreen.ts,app/utils/cn.ts}`、`apps/web/nuxt.config.ts`、`apps/admin/nuxt.config.ts`、`apps/*/app/assets/css/main.css`、`apps/admin/layers/20-comps/app/pages/demos/overlay.vue`、`apps/admin/app/config/admin-navigation.ts`、`docs/dev/layers.md`、根 `README.md`。
- 风险与未知：① Tailwind v4 **不扫 app 目录之外**的源码 → 必须加 `@source`；② layer 内**不能**用 `~/...` 或 `import { ref } from 'vue'`（按 `packages/ui/node_modules` 解析会失败，vue/@nuxt/ui 只能靠宿主的自动导入）；③ 动态 slot 名转发（`#[name]`）能否过 `vue-tsc` 需实测；④ 本机 pnpm store 冲突导致 `pnpm install` 被沙箱挡住（详见下方决策）。
- 验收：见 `Issue #20`（自动导入可用 / slot 契约一致 / 窄屏退化 / 隐式关闭只 emit 一次 / demos 页可访问 / 两端 typecheck+oxlint / SSR 无告警且首屏无浮层）。
- 第一刀：先搭 layer 骨架并让两端 `extends` + `@source` 跑通 typecheck，再写组件。
- 过门判断：`可开工`。

## 设计与决策

| 决策 | 理由 / 证据 | 确认者 | 日期 |
| ---- | ----------- | ------ | ---- |
| **用 Nuxt layer 而不是 npm 包（`packages/comps`）** | 共享组件依赖宿主的 `@nuxt/ui` 与 Tailwind：layer 是这套栈的原生方式 —— 零构建、源码级 HMR、自动导入、类型由 Nuxt 生成；npm 包则要 vite lib + d.ts + peer/样式处理 + 手动 import | Owner 确认 | 2026-10-07 |
| **拆成 `AppDrawer` + `AppModal` 两个组件**，而不是一个"响应式抽屉" | Owner 明确：抽屉是主体（形态由调用方决定方向/尺寸）；Modal 是"桌面对话框，窄屏自动退化为抽屉"的另一种语义。两者共用同一套 slot 契约，但不必强行合成一个 | Owner 确认 | 2026-10-07 |
| **`AppModal` 的移动分支复用 `AppDrawer`** | 否则"内置动作区 / 关闭语义 / size 映射"会长出两套实现，之后必然分叉 | 归枢记录 | 2026-10-07 |
| **layer 零运行时依赖**（`useNarrowScreen` 替代 `@vueuse/core` 的 `useMediaQuery`） | ① 依赖越少越不会与宿主的版本打架；② 本机 `pnpm install` 被沙箱挡住（要写 `~/Library/pnpm/store`）—— 与其绕环境，不如把这点能力自己实现（约 20 行） | 归枢记录 | 2026-10-07 |
| Tailwind 加 `@source "../../../../../packages/ui"` | Tailwind v4 默认**不扫 app 目录之外**的源码；不加这一行，layer 里的 `sm:max-w-md`、`min-h-0` 等类不会生成 | 归枢记录 | 2026-10-07 |
| 转发槽位用**动态 slot 名**（`v-for` + `#[name]`，只转发实际存在的） | 否则每个槽位都要在 UModal / UDrawer / AppDrawer 三处各写一遍 `v-if` 块（admin 现有版本就是这种重复）；`vue-tsc` 对这种写法没有报错 | 归枢记录 | 2026-10-07 |
| layer 内的公共代码放 `app/lib/**`（而非 `app/utils/**`） | `utils/` 会被 Nuxt 自动导入，而 admin 已有 `~/utils/cn` → 同名会撞车（`lib/` 不在自动导入目录里） | 归枢记录 | 2026-10-07 |
| layer 内引用自身一律用 `#layers/ui/app/...` 别名 | 实测：`packages/ui` 里相对 import `.vue` 可以，但相对 import **`.ts`（无扩展名）会报 TS2307**；用别名两端都正常（正好也是 DAO-009 定下的约定） | 归枢记录 | 2026-10-07 |
| 隐式关闭统一走 `close()` 且幂等 | Reka 在关闭动画结束后还会再触发一次 `update:open(false)`，不拦就会 emit 两次（admin 现有实现也踩过） | 归枢记录 | 2026-10-07 |
| 本轮不替换现有用法 | 先证明 layer 机制跑得通、组件 API 站得住；替换涉及 web 3 处 + admin 4 处，值得单独一张卡 | Owner 确认 | 2026-10-07 |

## 确认门与续跑

- 当前确认门：`已确认，已进入续跑`
- 需要确认：① 共享位置（layer / npm 包 / 各自一份）；② 响应式方向与组件拆分；③ demos 页位置。
- 已确认事实：Owner 选定 **① 新建 `packages/ui`（Nuxt layer）**；**② 抽屉为主体的 `AppDrawer` + 「<768px 退化为抽屉」的 `AppModal` 两个组件**；**③ demos 放 admin 现有 demos 目录**。已按此执行。

## 执行与验证

| 类型   | 命令 / 样本 / 链接 | 结果 | 仍未验证的边界 |
| ------ | ------------------ | ---- | -------------- |
| 机器验 | 两端 `typecheck`；`oxlint apps packages`（191 files） | 通过；oxlint 0 warning / 0 error | `format:check` 仍是既有缺口（DAO-006） |
| 结构验 | 两端 `.nuxt/tsconfig.json` 生成 `#layers/ui/*` 且 `include` 含 `packages/ui/app/**/*`；layer 里的组件被宿主 typecheck 扫到（改 layer 代码会直接让两端 typecheck 报错，即是证据） | 通过 | 未逐一核对 `.nuxt/components.d.ts` 的自动导入名单（但 demos 页未 import 就直接用了 `AppDrawer` / `AppModal`，SSR 也渲染出来了） |
| 意图验 | dev server 抓 admin `/demos/overlay`（`_:4047`） | 200；5 个示例 section 全部渲染；无 `Failed to resolve component` / `NUXT_E*`；**首屏无浮层**（`role="dialog"` 计数 0；唯一的 `data-reka` 来自导航菜单） | — |
| 意图验 | Tailwind 是否扫到 layer 的类 | 通过；生成的 CSS 里含 `40vh` / `60vh` / `95vh` / `min-h-0`（只出现在 AppDrawer 的 `SIZE_CLASS` 与布局类里）→ `@source` 生效 | — |
| 意图验 | 断点退化（playwright 1.58 + 本机 chromium，用 `evaluate` 直接驱动 DOM） | 通过：桌面 `AppModal` 的浮层 **无 vaul 属性**（= UModal），移动（375px）`AppModal` **有 vaul**（= 抽屉）；`AppDrawer` 两侧都是 vaul（抽屉）；无 console error | 浮层几何没测准 —— `[role="dialog"]` 命中的是外层包装（rect 为 0 或全屏），改用 `vaul` 属性区分两条渲染路径 |

## 交接

- 已完成：`packages/ui` layer 骨架（`package.json` / `nuxt.config.ts` / README）；`AppDrawer`、`AppModal`、`useNarrowScreen`、`cn`；两端 `extends` + Tailwind `@source`；admin demos 页与导航入口；layer 零运行时依赖。
- 当前状态：`self-tested`（编码与验证完成，待提交）
- 阻塞：无。
- 下一步第一刀：提交（layer+组件+demos / 文档 / 卡）并合回 dev，回填 Issue #20；之后另开一张卡做「现有浮层替换」。
- 文档锚点：`Issue #20`、`packages/ui/README.md`、`docs/dev/layers.md`
- 集成锚点：`待 feat/20-* -> dev`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：`待补`
- Git / PR：`待补`
- 常规提交：`待补`
- Dao Commit：`不适用`
- 沉淀候选：`候选观察` —— 「monorepo 里共享 Vue 组件该用 layer 而不是 npm 包」+ 「Tailwind v4 不扫 app 目录外，需要 `@source`」。两条都不是本仓特例，可能对其它 Nuxt monorepo 成立；React 侧对应物（workspace 包 + tailwind content 配置）值得在双仓闭环里对照。
- 收口备注：本卡还验证了「共享 layer 能否零依赖」——`useNarrowScreen` 替代 `@vueuse/core` 后，layer 不需要任何 dependencies，也就不需要为它跑一次 `pnpm install`。
