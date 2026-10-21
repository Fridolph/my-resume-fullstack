# Nuxt Layers 分层约定

`apps/web` 与 `apps/admin` 都用 Nuxt 4 **layers** 组织功能域（参考 早期项目 的 `layers/` 架构）。layers 放在 `<app>/layers/` 下，**自动发现**：每个 layer 需要一份 `nuxt.config.ts`，并用 `$meta.name` 命名。

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
| 能脱离 Vue，且是**构建 / 工具链基线**？ | `packages/config` | 包导入 `@rs/config`（**零构建**：`exports` 直指 `src/*.ts`，见 §9） |
| 与 Vue / Nuxt UI 相关，但**不含业务语义**？ | `packages/ui` | layer **自动导入**；需显式时用 `#layers/ui/app/...` |
| **含业务语义**？ | 各自业务 layer；**同一业务两端都要**（如简历展示）→ 上提 | layer 内引用 |
| app 专属外壳（布局 / 导航 / 用户菜单） | `apps/*/app/components` | 自动导入 |

### 8.2 `packages/ui` 的依赖规则

- `vue` 走 **peerDependencies + devDependencies**：不重复安装，同时让 `packages/ui` 目录内能解析到类型
- **允许 Vue 生态基础库**（`@vueuse/core` 等）作为 `dependencies` —— 它算"Vue 标准库的延伸"，不是业务库
- **重量级引擎 / 业务库**（`sortablejs`、`tiptap`、图表引擎…）**不允许**：由使用方（宿主）安装并注入
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

## 9. 构建基线：`packages/config`（DAO-042）

> 本节由 DAO-042 的实践沉淀。它补上 §8.1 判据里原先没有覆盖的一类：
> 「不碰 Vue、不含业务语义，但**必须被多个应用共用**的构建 / 工具链配置」。

### 9.1 它属于哪一层

| 问题                             | 答案                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| 能脱离 Vue / Nuxt UI 组件运行吗？ | 能 —— 它只产出一个配置对象，不注册组件、不渲染                          |
| 含业务语义吗？                   | 不含 —— 业务 alias 与业务模块由各 app 经 `overrides` 传入                |
| 落点                             | `packages/config`（`@rs/config`），**纯函数包、零构建、源码级共享** |

**为什么不用 Nuxt layer**：layer 会同时承担「页面 / 组件 / 样式」与「构建基线」两种职责，
正是 §8.1 判据要避免的混淆。**为什么不放进 `packages/ui`**：那会把 ui 的职责撑开。

> §2 里 `layers/00-shared`（`base-config`）标着「待建」。**"构建基线"这一类需求已由 `packages/config`
> 覆盖**，不必再为它在每个 app 里各建一份 —— 那恰好是"同一逻辑两端各一份"的老问题。
> `00-shared` 若仍要建，理由应该是**共享页面 / 组件**，而不是共享配置。

### 9.2 它怎么被加载（最反直觉的一点）

`nuxt.config.ts` 由 **c12 + jiti** 加载，时机**早于任何 `build`**。所以 `@rs/config` 的
`package.json` 里 `exports` **直接指向 `./src/index.ts`**，靠 jiti 现场转译 ——
**不需要预构建 `dist`，也不需要 turbo 的 `dependsOn: ['^build']`**。

- 实测（2026-10-16）：两端 `nuxt prepare` 均成功，jiti 能转译 workspace 内的 TS
- 类型检查仍走标准 `tsc -p tsconfig.json --noEmit`

### 9.3 坑三：共享配置工厂**无法**静态校验「模块提供的配置键」

`NuxtConfig` **没有索引签名**，而其中相当一部分键不是 `@nuxt/schema` 自己声明的，
而是由内部包 / 模块 `declare module` 增强进来：

| 键           | 提供者                                        | 为什么在 `packages/config` 里看不到                                                                  |
| ------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `icon`       | `@nuxt/icon`（`@nuxt/ui` 的传递依赖）         | 配置键由 Nuxt 在 `nuxt prepare` 时**按该应用实际安装的模块集**生成（`apps/<app>/.nuxt/schema/nuxt.schema.d.ts`） |
| `routeRules` | `@nuxt/nitro-server` 的 `dist/augments.d.mts` | 内部包，不在 `@nuxt/schema` 的导出面上                                                                |

**这些类型不是任何可 import 的单一入口**，而是"每个应用各自解析出来的结果" ——
一个与模块无关的共享配置包，天然无法证明它们存在。

- 修法：**只在这一小块**放弃静态校验（`AUGMENTED_OPTIONS` 一个显式白名单），
  其余键仍完整受类型检查 —— 对象展开合并不触发「多余属性」检查
- ⚠️ 往那个白名单加键**不会有编译错误**，只会在运行时报错；加之前先想清楚
- 同理：`$production` / `$development` 是 **c12** 的 `C12InputConfig` 键，不在 `NuxtConfig` 上，
  用 `RsNuxtConfigInput` 在类型层加宽（运行时 Nuxt / c12 本来就支持）

### 9.4 页面私有组件：`pages/<page>/components/`

页面复杂到一定程度，自然想把私有组件放在页面目录旁。但 Nuxt 默认把 `pages/` 下**每个 `.vue`
都当路由** —— 「私有组件」会变成一个可被外部访问的页面。**两件必须一起做，缺一不可**：

| 机制                                                  | 作用                            |
| ----------------------------------------------------- | ------------------------------- |
| `pages.pattern: ['**/*.vue', '!**/components/**']`    | **安全网**：不让它成为路由      |
| `hooks['components:dirs']` 遍历 `nuxt.options._layers` | **便利**：页面里不用手写 import |

只做前者 → 组件要手写 import；只做后者 → 组件同时成为可访问路由。

- **必须遍历 `_layers` 而非只扫应用自身**：业务 layer（如 `apps/web/layers/11-public-resume`）
  靠 Nuxt 4 的 `layers/` 约定**自动发现**，不是显式 `extends` 进来的 —— 只扫应用会漏掉它
- **名称策略**：`pathPrefix: true` **且**用 `extendComponent` 去掉 `Components` 段。
  前者给页面级作用域（避免不同页面的同名组件静默冲突），后者去掉「组件放在哪个目录」这个实现细节 ——
  否则得到的是 `CapabilitiesComponentsCard` 这种不可用的名字
- **已知边界**：若某层显式把 `srcDir` 设成 `app` 之外的名字，它的页面目录不在候选里
  （`NuxtConfigLayer` 类型上没有可直接读的 `srcDir`，不靠猜拼路径）。真出现时再补

### 9.5 改 `@rs/config` 必须重启 dev

Nuxt **只在启动时**求值 `nuxt.config`，HMR **不会**重跑 hook。

实测现象：改了 `extendComponent` 归一后，`.nuxt/components.d.ts` 里的名字**纹丝不动**；
重启 dev 后才从 `ProbeComponentsProbeCard` 变成 `ProbeProbeCard`。
排查这类问题时，「改了配置没生效」的第一反应应该是**重启**，而不是怀疑代码写错。
