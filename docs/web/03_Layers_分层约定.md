# Nuxt Layers 分层约定

`apps/web` 与 `apps/admin` 都用 Nuxt 4 **layers** 组织功能域（参考 greensketch 的 `layers/` 架构）。layers 放在 `<app>/layers/` 下，**自动发现**：每个 layer 需要一份 `nuxt.config.ts`，并用 `$meta.name` 命名。

## 1. 依赖方向（硬约束）

```
layers/00-shared  ←  feature layers（11~20）  ←  app/
未来可根据业务继续添加
```

- `app/` 可引用任意 layer（编排、跨域组合）。
- feature layer 只能依赖 `00-shared` + 自身。
- `00-shared` 不依赖任何 feature layer 或 `app/`。
- **跨层引用不被允许**，包括用别名引用别的 layer（别名是全局可见的，这条要靠约定自觉，见 §6）。

## 2. 当前 layer 划分

`apps/admin`：

| 目录                 | name          | 形态          | 内容                                                                           |
| -------------------- | ------------- | ------------- | ------------------------------------------------------------------------------ |
| `layers/11-resume`   | `resume`      | 完整 layer    | `app/pages/resume/*`（简历编辑域：草稿 / 布局 / 主题 / 版本）                  |
| `layers/11-projects` | `projects`    | 模板遗留 demo | `app/pages/projects/*`（项目域示例页，my-resume 暂未使用，去留待定）           |
| `layers/12-teams`    | `teams`       | 模板遗留 demo | `app/pages/team/*`（团队域示例页，同上）                                       |
| `layers/13-settings` | `settings`    | 完整 layer    | `app/config/settings-navigation.ts` + `app/pages/settings*`（二级侧栏 + 子页） |
| `layers/20-comps`    | `comps`       | 参考层        | `app/pages/comps/*`（组件库 demo 页，路由 `/comps/*`）                         |
| `layers/00-shared`   | `base-config` | 共享层        | **待建**（见 §3）                                                              |

`apps/web`：

| 目录                      | name            | 形态       | 内容                                                                                                          |
| ------------------------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `layers/11-public-resume` | `public-resume` | 完整 layer | 公开简历展示域：内容 / 布局 / 风格 / 编辑（`types`、`config`、`mock`、`components/resume/*`、`pages/resume`） |
| `layers/12-ai-talk`       | `ai-talk`       | 骨架 layer | 访客 AI 对话域（`app/pages/ai-talk`，当前为骨架页）                                                           |

`apps/admin/app/` 保留：`app.vue`、`layouts/`、`config/admin-navigation.ts`（主侧栏导航，跨域编排）、`components/`（公共/基础组件）、`utils/`、`types/`、`pages/`（dashboard、login、help、release-notes）。

## 3. 公共组件 vs 共享层（关键约定）

> ⚠️ 本节已按 2026-10-15 的实践更新（DAO-035）：原来的结论是"基础组件放 `app/components`、不下沉"，
> 但本仓是 monorepo —— **两端都要用的组件放在各 app 里，就是两份平行维护**（实测 `cn` 已经漂移过一次）。
> 现在按 §8 的**三层判据**决定落点：`app/components` 只留"这一端专属"的（如 `AdminSidebar`、`AdminHeader`）。

- **公共组件**（两端都用得到的）：`packages/ui`（见 §7、§8）
- **业务域组件**：各自的 feature layer（web 的 `11-public-resume`、admin 的 `11-resume` …）
- **app 专属外壳**（布局 / 导航 / 用户菜单）：`apps/*/app/components`
- **唯一实现**：同一能力不允许在两个 app 各写一份 —— `cn`、`query-keys` 的教训见 §8.5

## 4. 新增 feature layer 的步骤

1. `mkdir layers/<NN>-<name>/app/pages/...`，写入页面。
2. 建 `layers/<NN>-<name>/nuxt.config.ts`：
   ```ts
   export default defineNuxtConfig({ $meta: { name: '<name>' } })
   ```
3. admin：在 `app/config/admin-navigation.ts` 的主导航里补对应 `children`/路由。
4. `pnpm --filter @rs/<app> typecheck` + dev server SSR 验证。

## 5. 验证清单

- 所有 layer 页面 HTTP 正常、无 `Failed to resolve component` / `NUXT_E*` 告警。
- layer 内引用自身用 `#layers/<name>/app/...`，app 层内部用 `~/...`（见 §6）；业务代码里不应再出现 `../` 这种跨目录相对路径。
- 无跨层 import（feature layer 不 import 其它 feature layer 或 `app/`）。

## 6. 路径别名与 import 约定

别名由 Nuxt 生成，**不需要手写配置**（`.nuxt/tsconfig.json` 的 `paths` 里可见）：

| 写法                   | 指向                                                                              | 用途                 |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------- |
| `~/x` / `@/x`          | 该应用的 `srcDir`，即 `apps/<app>/app`                                            | app 层内部引用       |
| `~~/x` / `@@/x`        | 该应用根目录 `apps/<app>`                                                         | 极少用到             |
| `#layers/<name>/app/x` | 某个 layer 的 `app/` 目录（`<name>` = 该 layer `nuxt.config.ts` 的 `$meta.name`） | **layer 内引用自身** |

约定：

1. **layer 内引用自身**：`import type { ResumeContent } from '#layers/public-resume/app/types/resume'`。
2. **app 层内部**：`import { decreaseIndent } from '~/components/TextEditor/utils'`。
3. **同目录 / 子目录**仍用 `./x`（最直观，不受本节约束）。
4. **不得**用 `#layers/<别的层>` 引用其它 feature layer —— 依赖方向仍受 §1 约束。别名全局可见，这条要靠自觉（对照组：改别名前，跨层引用写起来很别扭，等于有一层隐性保护）。
5. 不要再用 `../../` 跨目录相对路径：它把「目录深度」编进了 import，移动文件或调整层级就要同步一批引用。

> **为什么 `@` 不能做到「在 layer 内指向 layer 自身」**：别名是一张全局扁平的 `名字 → 目录` 映射（Vite 与 `vue-tsc` 共用，后者走 `.nuxt/tsconfig.json` 的 `paths`），它没有「按导入文件所在位置解析」的能力。要实现那种语义，得自己写 Vite `resolveId` 插件，并为 TS 另造一套能表达条件解析的类型映射 —— 代价远大于收益，所以采用 Nuxt 官方的 `#layers/<name>`。

## 7. 跨 app 共享 UI 组件：`packages/ui`

web 与 admin 都要用的 Vue 组件放 `packages/ui`。它是 **Nuxt layer**（不是 npm 包）：

- 两端 `nuxt.config.ts` 各有一行 `extends: ['../../packages/ui']`；组件在 `packages/ui/app/components/**`
  里，宿主中**自动导入**（文件名即组件名，如 `MyDrawer`、`MyModal`），无需 import、无需构建
- layer 内引用自身用 `#layers/ui/app/...`（与 §6 同一条约定）
- **不要**写 `import { ref } from 'vue'` 或 `import x from '~/utils/...'`：前者会按 `packages/ui/node_modules`
  解析而失败，后者是宿主私有代码。用宿主的自动导入（`ref` / `computed` / `UButton` …）即可
- 可放 `app/components/**`、`app/composables/**`、`app/lib/**`；
  **不要**放 `app/utils/**`（该目录会被自动导入，容易与宿主的同名工具撞车）
- layer **不声明第三方运行时依赖**：需要能力时优先自己写（例：`useNarrowScreen` 替代 `@vueuse/core`）；
  但**可以依赖 workspace 内的纯 TS 包** —— 如 `@rs/common`（请求契约与纯工具），
  在 `packages/ui/package.json` 里以 `workspace:*` 声明（**不声明 TS 就解析不到**，会连带报一堆无关错误）
  （例：`app/composables/useNarrowScreen.ts` 替代了 `@vueuse/core` 的 `useMediaQuery`）
- ⚠️ Tailwind v4 **不扫 app 目录之外**的源码：各 app 的 `main.css` 里有
  `@source "../../../../../packages/ui";`，新增共享组件不需要改这一行

判断标准很简单：**能不能脱离 Vue 运行** —— 能 → `packages/common`（纯 TS，`tsc` 构建后 import）；
不能（含模板 / 依赖 Nuxt UI）→ `packages/ui`（layer，源码级共享）。

完整说明与组件 API 见 [`packages/ui/README.md`](../../packages/ui/README.md)。

## 8. 共享层的落点判据与已知边界

> 本节由 DAO-034 / DAO-035 的实践沉淀。Owner 2026-10-15 定调：
> **公共组件与工具该共享就共享** —— 这正是 monorepo 的初衷：维护一处，两端同时生效。

### 8.1 三层判据

| 问题 | 落点 | 引入方式 |
| --- | --- | --- |
| 能脱离 Vue 吗？（算法 / 类型 / 契约） | `packages/common` | 包导入 `@rs/common`（有构建） |
| 与 Vue / Nuxt UI 相关，但**不含业务语义**？ | `packages/ui` | layer **自动导入**；需显式时用 `#layers/ui/app/...` |
| **含业务语义**？ | 各自业务 layer；**同一业务两端都要**（如简历展示）→ 上提 | layer 内引用 |
| app 专属外壳（布局 / 导航 / 用户菜单） | `apps/*/app/components` | 自动导入 |

### 8.2 `packages/ui` 的依赖规则

- `vue` 走 **peerDependencies + devDependencies**：不重复安装，同时让 `packages/ui` 目录内能解析到类型
- **不允许业务库 / 重量级引擎**（`sortablejs`、`tiptap`、图表引擎…）—— 需要时由使用方（宿主）安装并注入
- ui 组件**能用**：框架层自动导入（`UModal` / `useToast`）、**同层**自动导入（`packages/ui/app/{components,composables,utils}`）
- ui 组件**不能依赖某一端独有的自动导入**（如 admin 的 `usePdfPage`）：ui 会被**两端同时编译与检查**
- ui 组件**不能 import 宿主的具名模块**（`~/types/x`、`~/apis/x`）：要么把该能力一起上提，要么改为注入

### 8.3 坑一：`defineProps<整个外部类型>()` 无法跟随包的 re-export 链

`@rs/common` 的 dist 入口是一串 `export * from './xxx.js'`，Vue 的 SFC 编译器到此为止，
报 `Unresolvable type reference or unsupported built-in utility type`。

**三个信号只有最后一个会出现**：`typecheck` 通过（TS 跟随 re-export）、`build` 通过（生产不做运行时 props 推断）、
**只有 dev 的 SFC 编译会炸**。

- 修法：让引用路径**直达源码定义** —— 见 `apps/web/layers/11-public-resume/nuxt.config.ts` 的 `alias`
- 对照：`packages/ui` 的 `MySchemaForm` 用同样的 `@rs/common` 类型却没事，因为它是
  `defineProps<{ …; segments: FormSegmentSchema[] }>()` 这种**内联对象类型**（编译器只解析外层，
  字段引用解析不到会降级）；整个类型都在包外时无处可降
- 推论（写新组件时）：props 里引用外部类型，**优先内联外层**、让字段指向外部类型；
  或确保消费端能解析到定义

### 8.4 坑二：批量转发 slots 无法静态满足类型

`<slot :name="动态名" v-bind="{ ...slotProps, close }">` —— 6 个 slot 的参数类型各不相同
（`footer` 要 close/confirm/cancel，`content` 不要），类型系统表达不了"对每个 slot 都成立"。
`MyDrawer` / `MyModal` 在那一处用 `as any` + 注释说明；**`defineSlots` 的声明保持精确**，使用方仍有提示。

### 8.5 能力叠加：组件与权限

ui 组件**只描述"能做什么"，不判断"谁可以做"** —— 编辑入口是否出现，由宿主经 props / slots / composable 注入。
本仓已在用的三种扩展点：`MySchemaForm` 的 `list-item-extra` 插槽、`MyModal` 的 `footer` 插槽、`plugins/api.ts` 的 `$api`。

例：展示容器接收 `editable` prop 或 `#section-actions` 插槽 —— web 传 `false` 纯展示，admin 传 `true` 注入拖拽编辑。

### 8.6 为什么必须"唯一实现"

`cn` 曾在 `packages/ui/app/lib` 与 `apps/admin/app/utils` 各有一份（内容相同、注释不同）；
`query-keys` 两端各一份。前者的代价是"改一处忘了另一处"，后者的代价更隐蔽 ——
**key 对不上不会报错**，只会让缓存失效静默失效。收敛后：`cn` 在 `packages/ui/app/utils/`（`utils/` 才在自动导入范围内），
`query-keys` 的简历域 key 在 `packages/ui/app/utils/query-keys.ts`。
